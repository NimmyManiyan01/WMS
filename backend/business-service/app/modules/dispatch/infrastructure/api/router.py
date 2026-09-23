"""
FastAPI REST router for Outbound Finished-Goods Dispatch and Gate Exit module.
"""
from __future__ import annotations

from datetime import datetime, timezone
import logging
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.common.domain.exceptions import NotFoundException
from app.database.session import UnitOfWork, get_uow
from app.modules.dispatch.infrastructure.api.dto import (
    ConfirmGateExitRequest,
    OutboundDispatchResponse,
    OutboundGateExitExceptionResponse,
    OutboundGateExitResponse,
    ReportMismatchRequest,
    ResolveMismatchRequest,
)
from app.modules.dispatch.infrastructure.persistence.models import (
    OutboundDispatchModel,
    OutboundGateExitExceptionModel,
    OutboundGateExitModel,
)
from app.modules.procurement.infrastructure.persistence.models import NotificationModel
from app.security.dependencies import CurrentUser, get_current_user, require_permission

router = APIRouter(prefix="/api/v1/dispatch", tags=["dispatch"])
logger = logging.getLogger(__name__)


def _to_dispatch_response(dispatch: OutboundDispatchModel) -> OutboundDispatchResponse:
    exit_dto = None
    if dispatch.gate_exit:
        ge = dispatch.gate_exit
        exit_dto = OutboundGateExitResponse(
            id=str(ge.id),
            dispatch_id=str(ge.dispatch_id),
            security_officer_id=ge.security_officer_id,
            vehicle_verified=ge.vehicle_verified,
            driver_verified=ge.driver_verified,
            remarks=ge.remarks,
            status=ge.status,
            exit_completed_at=ge.exit_completed_at.isoformat() if ge.exit_completed_at else "",
            created_at=ge.created_at.isoformat() if ge.created_at else "",
        )

    active_exc_dto = None
    if getattr(dispatch, "exceptions", None):
        # Find action_required exception or the latest exception
        action_req = next((e for e in dispatch.exceptions if e.status == "ACTION_REQUIRED"), dispatch.exceptions[0] if dispatch.exceptions else None)
        if action_req:
            active_exc_dto = OutboundGateExitExceptionResponse(
                id=str(action_req.id),
                dispatch_id=str(action_req.dispatch_id),
                dispatch_number=action_req.dispatch_number,
                expected_vehicle=action_req.expected_vehicle,
                expected_driver=action_req.expected_driver,
                actual_vehicle=action_req.actual_vehicle,
                actual_driver=action_req.actual_driver,
                verification_result=action_req.verification_result,
                mismatch_reason=action_req.mismatch_reason,
                security_officer_id=action_req.security_officer_id,
                status=action_req.status,
                resolution_action=action_req.resolution_action,
                resolution_notes=action_req.resolution_notes,
                resolved_by=action_req.resolved_by,
                resolved_at=action_req.resolved_at.isoformat() if action_req.resolved_at else None,
                created_at=action_req.created_at.isoformat() if action_req.created_at else "",
                updated_at=action_req.updated_at.isoformat() if action_req.updated_at else "",
            )

    return OutboundDispatchResponse(
        id=str(dispatch.id),
        dispatch_number=dispatch.dispatch_number,
        customer_name=dispatch.customer_name,
        order_reference=dispatch.order_reference,
        vehicle_number=dispatch.vehicle_number,
        driver_name=dispatch.driver_name,
        driver_phone=dispatch.driver_phone,
        loading_status=dispatch.loading_status,
        status=dispatch.status,
        items_summary=dispatch.items_summary,
        destination_address=dispatch.destination_address,
        seal_number=dispatch.seal_number,
        eway_bill=dispatch.eway_bill,
        transporter=dispatch.transporter,
        gross_weight=dispatch.gross_weight,
        dock_bay=dispatch.dock_bay,
        warehouse_id=dispatch.warehouse_id,
        ready_time=dispatch.updated_at.strftime("%H:%M") if dispatch.updated_at else None,
        created_at=dispatch.created_at.isoformat() if dispatch.created_at else "",
        updated_at=dispatch.updated_at.isoformat() if dispatch.updated_at else "",
        gate_exit=exit_dto,
        active_exception=active_exc_dto,
    )


async def _ensure_sample_dispatches(session, force_seed: bool = False) -> int:
    """Auto-seed sample finished-goods dispatches if none exist in the database or if force_seed is requested."""
    if not force_seed:
        result = await session.execute(select(OutboundDispatchModel).limit(1))
        if result.scalars().first() is not None:
            return 0

    suffix = str(uuid.uuid4())[:4].upper()
    samples = [
        OutboundDispatchModel(
            id=uuid.uuid4(),
            dispatch_number=f"DISP-2026-001-{suffix}" if force_seed else "DISP-2026-001",
            customer_name="Acme Industrial Supplies Pvt Ltd",
            order_reference=f"SO-2026-8901-{suffix}" if force_seed else "SO-2026-8901",
            vehicle_number="MH-12-AB-5678",
            driver_name="Ramesh Kumar",
            driver_phone="+91 98765 43210",
            loading_status="LOADING_COMPLETED",
            status="READY_FOR_GATE_EXIT",
            items_summary="150 Units — Finished Goods Solar Inverters (Model X-200)",
            destination_address="Plot 42, Chakan Industrial Area Phase II, Pune 410501",
            seal_number="SL-8841-PNE",
            eway_bill="EWB-9912-0488-2190",
            transporter="VRL Express Logistics",
            gross_weight="4,850 kg",
            dock_bay="Dock Bay 04",
            warehouse_id="WH_PUNE-01",
        ),
        OutboundDispatchModel(
            id=uuid.uuid4(),
            dispatch_number=f"DISP-2026-002-{suffix}" if force_seed else "DISP-2026-002",
            customer_name="Global Logistics Infrastructure Ltd",
            order_reference=f"SO-2026-8902-{suffix}" if force_seed else "SO-2026-8902",
            vehicle_number="KA-05-MN-1234",
            driver_name="Suresh Patil",
            driver_phone="+91 98220 11223",
            loading_status="LOADING_COMPLETED",
            status="READY_FOR_GATE_EXIT",
            items_summary="300 Units — Heavy Duty Automotive Battery Packs (EV-75kWh)",
            destination_address="Sector 18, Electronic City Phase I, Bengaluru 560100",
            seal_number="SL-9932-BLR",
            eway_bill="EWB-8831-5512-0041",
            transporter="TCI Freight Carriers",
            gross_weight="8,200 kg",
            dock_bay="Dock Bay 02",
            warehouse_id="WH_PUNE-01",
        ),
        OutboundDispatchModel(
            id=uuid.uuid4(),
            dispatch_number=f"DISP-2026-003-{suffix}" if force_seed else "DISP-2026-003",
            customer_name="Vertex Enterprise Systems Pvt Ltd",
            order_reference=f"SO-2026-8903-{suffix}" if force_seed else "SO-2026-8903",
            vehicle_number="TS-09-EA-9988",
            driver_name="Vikram Singh",
            driver_phone="+91 97110 55443",
            loading_status="LOADING_COMPLETED",
            status="READY_FOR_GATE_EXIT",
            items_summary="80 Units — Industrial High-Voltage Power Control Panels",
            destination_address="Building 3, HITEC City Phase II, Hyderabad 500081",
            seal_number="SL-4410-HYD",
            eway_bill="EWB-7720-3341-9982",
            transporter="Gati Cargo Distribution",
            gross_weight="3,600 kg",
            dock_bay="Dock Bay 06",
            warehouse_id="WH_PUNE-01",
        ),
    ]
    for s in samples:
        session.add(s)
    await session.commit()
    return len(samples)


@router.get("/queue", response_model=List[OutboundDispatchResponse])
async def list_outbound_dispatch_queue(
    status: Optional[str] = Query(None, description="Filter by status (e.g. READY_FOR_GATE_EXIT, GATE_OUT)"),
    search: Optional[str] = Query(None, description="Search by dispatch number, customer, vehicle, or driver"),
    _user: CurrentUser = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
) -> List[OutboundDispatchResponse]:
    """
    Fetch outbound finished-goods dispatch queue for security gate exit.
    Automatically ensures sample dispatches exist if database table is empty.
    """
    await _ensure_sample_dispatches(uow.session)

    query = select(OutboundDispatchModel).options(
        selectinload(OutboundDispatchModel.gate_exit),
        selectinload(OutboundDispatchModel.exceptions),
    ).order_by(OutboundDispatchModel.created_at.desc())

    status_val = status if isinstance(status, str) else None
    if status_val and status_val.strip().upper() != "ALL":
        query = query.where(OutboundDispatchModel.status == status_val.strip().upper())
    else:
        # Default to dispatches ready for exit, mismatched, or completed
        query = query.where(OutboundDispatchModel.status.in_(["READY_FOR_GATE_EXIT", "GATE_EXIT_MISMATCH", "GATE_OUT", "EXIT_COMPLETED"]))

    search_val = search if isinstance(search, str) else None
    if search_val and search_val.strip():
        term = f"%{search_val.strip().upper()}%"
        query = query.where(
            or_(
                OutboundDispatchModel.dispatch_number.ilike(term),
                OutboundDispatchModel.customer_name.ilike(term),
                OutboundDispatchModel.order_reference.ilike(term),
                OutboundDispatchModel.vehicle_number.ilike(term),
                OutboundDispatchModel.driver_name.ilike(term),
            )
        )

    result = await uow.session.execute(query)
    models = result.scalars().all()
    return [_to_dispatch_response(m) for m in models]


@router.post("/seed-sample", response_model=dict)
async def seed_sample_dispatches_endpoint(
    force: bool = Query(False, description="Set to true to force generate fresh test dispatches"),
    _user: CurrentUser = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
) -> dict:
    """Explicit endpoint to populate sample READY_FOR_GATE_EXIT dispatches."""
    count = await _ensure_sample_dispatches(uow.session, force_seed=force)
    return {"status": "ok", "message": f"Created {count} sample outbound dispatches.", "count": count}


@router.get("/{dispatch_id}", response_model=OutboundDispatchResponse)
async def get_outbound_dispatch(
    dispatch_id: str,
    _user: CurrentUser = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
) -> OutboundDispatchResponse:
    """Fetch single outbound dispatch record by ID or Dispatch Number."""
    query = select(OutboundDispatchModel).options(
        selectinload(OutboundDispatchModel.gate_exit),
        selectinload(OutboundDispatchModel.exceptions),
    )

    try:
        dispatch_uuid = uuid.UUID(dispatch_id)
        query = query.where(or_(OutboundDispatchModel.id == dispatch_uuid, OutboundDispatchModel.dispatch_number == dispatch_id.strip()))
    except ValueError:
        query = query.where(OutboundDispatchModel.dispatch_number == dispatch_id.strip().upper())

    result = await uow.session.execute(query)
    dispatch = result.scalars().first()
    if dispatch is None:
        raise NotFoundException(f"Outbound dispatch '{dispatch_id}' not found")

    return _to_dispatch_response(dispatch)


@router.post("/{dispatch_id}/report-mismatch", response_model=OutboundDispatchResponse)
async def report_outbound_gate_exit_mismatch(
    dispatch_id: str,
    request: ReportMismatchRequest,
    user: CurrentUser = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
) -> OutboundDispatchResponse:
    """
    Report a vehicle or driver mismatch during Security physical gate verification.
    
    Creates a Gate Exit Exception record (status: ACTION_REQUIRED),
    updates Dispatch status to GATE_EXIT_MISMATCH,
    and notifies the Dispatch/Warehouse team.
    """
    if not request.mismatch_reason or not request.mismatch_reason.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Mismatch reason must be provided by Security Officer."
        )

    try:
        dispatch_uuid = uuid.UUID(dispatch_id)
        filter_expr = or_(OutboundDispatchModel.id == dispatch_uuid, OutboundDispatchModel.dispatch_number == dispatch_id.strip())
    except ValueError:
        filter_expr = OutboundDispatchModel.dispatch_number == dispatch_id.strip().upper()

    result = await uow.session.execute(
        select(OutboundDispatchModel)
        .options(
            selectinload(OutboundDispatchModel.gate_exit),
            selectinload(OutboundDispatchModel.exceptions),
        )
        .where(filter_expr)
        .with_for_update()
    )
    dispatch = result.scalars().first()
    if dispatch is None:
        raise NotFoundException(f"Outbound dispatch '{dispatch_id}' not found.")

    if (dispatch.status or "").upper() == "GATE_OUT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Gate exit has already been completed for Dispatch '{dispatch.dispatch_number}'."
        )

    now = datetime.now(timezone.utc)

    # Create exception record
    exception_record = OutboundGateExitExceptionModel(
        id=uuid.uuid4(),
        dispatch_id=dispatch.id,
        dispatch_number=dispatch.dispatch_number,
        expected_vehicle=dispatch.vehicle_number,
        expected_driver=dispatch.driver_name,
        actual_vehicle=request.actual_vehicle.strip() if request.actual_vehicle else None,
        actual_driver=request.actual_driver.strip() if request.actual_driver else None,
        verification_result=request.verification_result,
        mismatch_reason=request.mismatch_reason.strip(),
        security_officer_id=user.username,
        status="ACTION_REQUIRED",
        created_at=now,
        updated_at=now,
    )
    uow.session.add(exception_record)

    dispatch.status = "GATE_EXIT_MISMATCH"
    dispatch.updated_at = now

    # In-app notifications for Dispatch/Warehouse team
    uow.session.add(NotificationModel(
        user_role="WAREHOUSE",
        title="Gate Exit Mismatch Flagged",
        message=f"Gate Exit blocked for Dispatch {dispatch.dispatch_number} ({dispatch.customer_name}). Security reported {request.verification_result}: {request.mismatch_reason[:120]}",
        link="/vehicle-exit?module=gate",
    ))
    uow.session.add(NotificationModel(
        user_role="DISPATCH",
        title="Outbound Mismatch Exception - Action Required",
        message=f"Dispatch {dispatch.dispatch_number} requires manifest review. Vehicle/Driver mismatch reported by Security officer {user.username}.",
        link="/vehicle-exit?module=gate",
    ))

    await uow.session.flush()
    dispatch.exceptions.insert(0, exception_record)

    logger.warning(
        "Gate Exit mismatch flagged for Dispatch '%s' by Security '%s' (Result: %s)",
        dispatch.dispatch_number,
        user.username,
        request.verification_result,
    )

    return _to_dispatch_response(dispatch)


@router.post("/{dispatch_id}/resolve-mismatch", response_model=OutboundDispatchResponse)
async def resolve_outbound_gate_exit_mismatch(
    dispatch_id: str,
    request: ResolveMismatchRequest,
    user: CurrentUser = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
) -> OutboundDispatchResponse:
    """
    Resolve an active Gate Exit mismatch exception (by Dispatch/Warehouse manager).
    
    Supports:
    1. UPDATE_MANIFEST: Updates dispatch assigned vehicle/driver info.
    2. CONFIRM_CLEARED: Clears exception with manifest unchanged.
    
    Updates exception status to RESOLVED, returns Dispatch status to READY_FOR_GATE_EXIT,
    and notifies Gate Security.
    """
    if not request.resolution_notes or not request.resolution_notes.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resolution notes must be provided."
        )

    try:
        dispatch_uuid = uuid.UUID(dispatch_id)
        filter_expr = or_(OutboundDispatchModel.id == dispatch_uuid, OutboundDispatchModel.dispatch_number == dispatch_id.strip())
    except ValueError:
        filter_expr = OutboundDispatchModel.dispatch_number == dispatch_id.strip().upper()

    result = await uow.session.execute(
        select(OutboundDispatchModel)
        .options(
            selectinload(OutboundDispatchModel.gate_exit),
            selectinload(OutboundDispatchModel.exceptions),
        )
        .where(filter_expr)
        .with_for_update()
    )
    dispatch = result.scalars().first()
    if dispatch is None:
        raise NotFoundException(f"Outbound dispatch '{dispatch_id}' not found.")

    # Find active ACTION_REQUIRED exception
    active_exc = next((e for e in dispatch.exceptions if e.status == "ACTION_REQUIRED"), None)
    if not active_exc and (dispatch.status or "").upper() != "GATE_EXIT_MISMATCH":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dispatch '{dispatch.dispatch_number}' does not have an active mismatch exception needing resolution."
        )

    now = datetime.now(timezone.utc)

    # 1. Update manifest if requested
    if request.resolution_action == "UPDATE_MANIFEST":
        if request.new_vehicle_number and request.new_vehicle_number.strip():
            dispatch.vehicle_number = request.new_vehicle_number.strip().upper()
        if request.new_driver_name and request.new_driver_name.strip():
            dispatch.driver_name = request.new_driver_name.strip()
        if request.new_driver_phone and request.new_driver_phone.strip():
            dispatch.driver_phone = request.new_driver_phone.strip()

    # 2. Update exception record
    if active_exc:
        active_exc.status = "RESOLVED"
        active_exc.resolution_action = request.resolution_action
        active_exc.resolution_notes = request.resolution_notes.strip()
        active_exc.resolved_by = user.username
        active_exc.resolved_at = now
        active_exc.updated_at = now

    # 3. Return dispatch status to READY_FOR_GATE_EXIT
    dispatch.status = "READY_FOR_GATE_EXIT"
    dispatch.updated_at = now

    # 4. In-app notification for Gate Security
    uow.session.add(NotificationModel(
        user_role="GATE_SECURITY",
        title="Gate Exit Mismatch Resolved",
        message=f"Dispatch {dispatch.dispatch_number} mismatch resolved ({request.resolution_action}) by {user.username}. Ready for Gate Security re-verification.",
        link="/vehicle-exit?module=gate",
    ))
    uow.session.add(NotificationModel(
        user_role="WAREHOUSE",
        title="Dispatch Exception Resolved",
        message=f"Mismatch for Dispatch {dispatch.dispatch_number} resolved by {user.username}. Status restored to READY_FOR_GATE_EXIT.",
        link="/vehicle-exit?module=gate",
    ))

    await uow.session.flush()

    logger.info(
        "Gate Exit mismatch resolved for Dispatch '%s' by '%s' (Action: %s)",
        dispatch.dispatch_number,
        user.username,
        request.resolution_action,
    )

    return _to_dispatch_response(dispatch)


@router.post("/{dispatch_id}/gate-exit", response_model=OutboundDispatchResponse)
async def confirm_outbound_gate_exit(
    dispatch_id: str,
    request: ConfirmGateExitRequest,
    user: CurrentUser = Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
) -> OutboundDispatchResponse:
    """
    Confirm Security Gate Exit for outbound finished-goods dispatch.
    
    Validates:
    1. Both vehicle_verified and driver_verified are True.
    2. Dispatch exists.
    3. Dispatch status is READY_FOR_GATE_EXIT (and not GATE_EXIT_MISMATCH).
    4. Vehicle and Driver are assigned.
    5. Gate exit has not already been completed for this dispatch (duplicate prevention).
    6. No active ACTION_REQUIRED exception exists.
    
    Updates:
    - Creates OutboundGateExitModel.
    - Sets Gate Exit status to EXIT_COMPLETED.
    - Updates Dispatch status to GATE_OUT.
    - Creates Audit & Notification log.
    All executed within a single database transaction.
    """
    # 1. Validate Security verification checkboxes
    if not request.vehicle_verified:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Vehicle verification check must be confirmed by Security."
        )
    if not request.driver_verified:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Driver verification check must be confirmed by Security."
        )

    # 2. Lock & Fetch Dispatch record
    try:
        dispatch_uuid = uuid.UUID(dispatch_id)
        filter_expr = or_(OutboundDispatchModel.id == dispatch_uuid, OutboundDispatchModel.dispatch_number == dispatch_id.strip())
    except ValueError:
        filter_expr = OutboundDispatchModel.dispatch_number == dispatch_id.strip().upper()

    result = await uow.session.execute(
        select(OutboundDispatchModel)
        .options(
            selectinload(OutboundDispatchModel.gate_exit),
            selectinload(OutboundDispatchModel.exceptions),
        )
        .where(filter_expr)
        .with_for_update()
    )
    dispatch = result.scalars().first()

    if dispatch is None:
        raise NotFoundException(f"Outbound dispatch '{dispatch_id}' not found.")

    # 3. Verify status & duplicates
    if (dispatch.status or "").upper() == "GATE_OUT" or dispatch.gate_exit is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Gate exit has already been completed for Dispatch '{dispatch.dispatch_number}'."
        )

    if (dispatch.status or "").upper() == "GATE_EXIT_MISMATCH":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot confirm Gate Exit: Dispatch '{dispatch.dispatch_number}' has an active mismatch exception. Dispatch team must resolve it first."
        )

    if (dispatch.status or "").upper() != "READY_FOR_GATE_EXIT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Dispatch '{dispatch.dispatch_number}' is in status '{dispatch.status}' and is not ready for gate exit."
        )

    # Verify no unresolved ACTION_REQUIRED exception
    active_exc = next((e for e in dispatch.exceptions if e.status == "ACTION_REQUIRED"), None)
    if active_exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot confirm Gate Exit: Dispatch '{dispatch.dispatch_number}' has an active unresolved exception."
        )

    # 4. Verify assigned Vehicle & Driver
    if not (dispatch.vehicle_number and dispatch.vehicle_number.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dispatch is missing assigned vehicle number."
        )
    if not (dispatch.driver_name and dispatch.driver_name.strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dispatch is missing assigned driver name."
        )

    # 5. Execute transactional updates
    now = datetime.now(timezone.utc)
    gate_exit_record = OutboundGateExitModel(
        id=uuid.uuid4(),
        dispatch_id=dispatch.id,
        security_officer_id=user.username,
        vehicle_verified=request.vehicle_verified,
        driver_verified=request.driver_verified,
        remarks=request.remarks.strip() if request.remarks else None,
        status="EXIT_COMPLETED",
        exit_completed_at=now,
        created_at=now,
        updated_at=now,
    )
    uow.session.add(gate_exit_record)

    dispatch.status = "GATE_OUT"
    dispatch.updated_at = now

    # 6. Audit & Notification log
    uow.session.add(NotificationModel(
        user_role="GATE_SECURITY",
        title="Outbound Gate Exit Completed",
        message=f"Vehicle {dispatch.vehicle_number} cleared gate exit for Dispatch {dispatch.dispatch_number} ({dispatch.customer_name}).",
        link="/vehicle-exit?module=gate",
    ))
    uow.session.add(NotificationModel(user_role="WAREHOUSE", title="Outbound Vehicle Cleared Gate", message=f"Vehicle {dispatch.vehicle_number} for Order {dispatch.order_reference} has departed the warehouse premises.", link="/vehicle-exit?module=gate"))

    await uow.session.flush()
    dispatch.gate_exit = gate_exit_record

    logger.info(
        "Gate exit completed for Outbound Dispatch '%s' (Vehicle: %s, Officer: %s)",
        dispatch.dispatch_number,
        dispatch.vehicle_number,
        user.username,
    )

    return _to_dispatch_response(dispatch)
