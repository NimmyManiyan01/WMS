import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.common.api_model import ApiModel
from app.database.session import UnitOfWork, get_uow
from app.modules.procurement.infrastructure.persistence.models import (
    MaterialModel,
    MaterialStockModel,
    MaterialVariantModel,
    NotificationModel,
)
from app.modules.quarantine.infrastructure.persistence.models import QuarantineRecordModel
from app.modules.storage.infrastructure.persistence.models import (
    AssemblyRequisitionItemModel,
    AssemblyRequisitionModel,
    InventoryLocationBalanceModel,
    PickupTaskModel,
)
from app.modules.store.infrastructure.persistence.models import StoreModel
from app.security.dependencies import CurrentUser, get_current_user

router = APIRouter(prefix="/api/v1/assembly-requisitions", tags=["assembly-requisitions"])


class AssemblyRequisitionItemSchema(ApiModel):
    id: Optional[str] = None
    material_id: Optional[str] = None
    material_variant_id: Optional[str] = None
    material_code: str
    variant_code: Optional[str] = None
    material_name: str
    requested_quantity: Decimal
    issued_quantity: Decimal = Decimal("0.0")
    available_quantity: Decimal = Decimal("0.0")
    has_sufficient_stock: bool = False
    shortage_quantity: Decimal = Decimal("0.0")
    uom: str = "PCS"
    is_custom: bool = False
    custom_material_name: Optional[str] = None


class CreateAssemblyRequisitionItem(BaseModel):
    material_id: Optional[str] = None
    material_variant_id: Optional[str] = None
    material_code: Optional[str] = None
    variant_code: Optional[str] = None
    material_name: Optional[str] = None
    quantity: Decimal
    uom: str = "PCS"
    is_custom: Optional[bool] = False
    custom_material_name: Optional[str] = None


class CreateAssemblyRequisitionRequest(BaseModel):
    warehouse_id: str = "Main Warehouse"
    department: str = "Assembly"
    requested_by: str
    priority: str = "MEDIUM"
    required_date: date
    remarks: Optional[str] = None
    items: List[CreateAssemblyRequisitionItem]


class AssignStoreToRequisitionRequest(BaseModel):
    store_id: str


class CreateMaterialForRequisitionItemRequest(BaseModel):
    material_name: Optional[str] = None
    category: Optional[str] = "Raw Materials"
    description: Optional[str] = None
    base_uom: Optional[str] = None
    specifications: Optional[dict] = None


class LinkMaterialToRequisitionItemRequest(BaseModel):
    material_id: str
    material_variant_id: Optional[str] = None


class AssemblyRequisitionResponse(ApiModel):
    id: str
    requisition_number: str
    warehouse_id: str
    department: str
    requested_by: str
    priority: str
    required_date: date
    status: str
    assigned_store_id: Optional[str] = None
    assigned_store_code: Optional[str] = None
    assigned_store_name: Optional[str] = None
    assigned_by: Optional[str] = None
    assigned_at: Optional[datetime] = None
    remarks: Optional[str] = None
    items: List[AssemblyRequisitionItemSchema] = []
    all_items_available: bool = False
    can_assign_store: bool = False
    availability_status: str = "AVAILABLE"
    availability_message: Optional[str] = None
    pickup_tracking: List[dict] = []
    pickup_progress: dict = {}
    created_at: datetime
    updated_at: datetime


async def _build_requisition_responses_with_availability(
    requisitions: List[AssemblyRequisitionModel],
    session: AsyncSession,
) -> List[AssemblyRequisitionResponse]:
    if not requisitions:
        return []

    # 1. Collect all registered material codes across the requisitions
    material_codes = set()
    for r in requisitions:
        for it in (r.items or []):
            m_code = (it.material_code or "").strip()
            if m_code and m_code != "CUSTOM" and not getattr(it, "is_custom", False):
                material_codes.add(m_code)

    stock_map: Dict[str, Decimal] = {}
    loc_bal_map: Dict[str, Decimal] = {}
    quar_map: Dict[str, Decimal] = {}

    if material_codes:
        # Fetch MaterialStockModel
        stocks_res = await session.execute(
            select(MaterialStockModel).where(MaterialStockModel.material_code.in_(material_codes))
        )
        for s in stocks_res.scalars().all():
            stock_map[s.material_code] = Decimal(str(s.available or 0))

        # Fetch Location Balances
        loc_res = await session.execute(
            select(
                InventoryLocationBalanceModel.material_code,
                func.sum(InventoryLocationBalanceModel.available_quantity),
            )
            .where(InventoryLocationBalanceModel.material_code.in_(material_codes))
            .group_by(InventoryLocationBalanceModel.material_code)
        )
        for m_code, total_bal in loc_res.all():
            loc_bal_map[m_code] = Decimal(str(total_bal or 0))

        # Fetch Quarantined items
        quar_res = await session.execute(
            select(
                QuarantineRecordModel.item_code,
                func.sum(QuarantineRecordModel.damaged_quantity),
            )
            .where(
                QuarantineRecordModel.item_code.in_(material_codes),
                QuarantineRecordModel.status.in_(["PENDING_REVIEW", "QUARANTINED"]),
            )
            .group_by(QuarantineRecordModel.item_code)
        )
        for m_code, total_quar in quar_res.all():
            quar_map[m_code] = Decimal(str(total_quar or 0))

    def get_effective_available(m_code: str) -> Decimal:
        stk_avail = stock_map.get(m_code, Decimal("0.0"))
        quar = quar_map.get(m_code, Decimal("0.0"))
        effective_stk = max(Decimal("0.0"), stk_avail - quar)
        loc_avail = loc_bal_map.get(m_code, Decimal("0.0"))
        return max(effective_stk, loc_avail)

    responses = []
    requisition_ids = [r.id for r in requisitions]
    pickup_map: Dict[uuid.UUID, List[PickupTaskModel]] = {rid: [] for rid in requisition_ids}
    if requisition_ids:
        pickup_result = await session.execute(
            select(PickupTaskModel).where(PickupTaskModel.requisition_id.in_(requisition_ids))
        )
        for task in pickup_result.scalars().all():
            pickup_map.setdefault(task.requisition_id, []).append(task)
    for r in requisitions:
        item_schemas: List[AssemblyRequisitionItemSchema] = []
        for it in (r.items or []):
            is_custom = bool(
                getattr(it, "is_custom", False)
                or it.material_code == "CUSTOM"
                or not it.material_id
            )
            req_qty = Decimal(str(it.requested_quantity or 0))

            if is_custom:
                avail_qty = Decimal("0.0")
                has_stock = False
                shortage = req_qty
            else:
                avail_qty = get_effective_available(it.material_code)
                has_stock = (avail_qty >= req_qty)
                shortage = max(Decimal("0.0"), req_qty - avail_qty)

            item_schemas.append(
                AssemblyRequisitionItemSchema(
                    id=str(it.id),
                    material_id=str(it.material_id) if it.material_id else None,
                    material_variant_id=str(it.material_variant_id) if it.material_variant_id else None,
                    material_code=it.material_code,
                    variant_code=it.variant_code,
                    material_name=it.material_name,
                    requested_quantity=req_qty,
                    issued_quantity=Decimal(str(it.issued_quantity or 0)),
                    available_quantity=avail_qty,
                    has_sufficient_stock=has_stock,
                    shortage_quantity=shortage,
                    uom=it.uom,
                    is_custom=is_custom,
                    custom_material_name=getattr(it, "custom_material_name", None),
                )
            )

        all_available = bool(item_schemas and all(i.has_sufficient_stock for i in item_schemas))
        req_status = (r.status or "PENDING").upper()
        can_assign = all_available and (req_status == "PENDING")

        if req_status != "PENDING":
            avail_status = req_status
            avail_msg = None
        elif all_available:
            avail_status = "AVAILABLE"
            avail_msg = "All materials available in inventory — Ready for Store assignment"
        else:
            avail_status = "SHORTAGE"
            avail_msg = "Material shortage — Store assignment unavailable"

        tasks = pickup_map.get(r.id, [])
        tracking = [{
            "task_number": task.task_number,
            "material_code": task.material_code,
            "material_name": task.material_name,
            "requested_quantity": float(task.requested_quantity or 0),
            "picked_quantity": float(task.picked_quantity or 0),
            "remaining_quantity": float((task.requested_quantity or 0) - (task.picked_quantity or 0)),
            "status": task.status,
            "store_code": task.store_code,
            "store_name": task.store_name,
            "started_at": task.started_at,
            "completed_at": task.completed_at,
            "updated_at": task.updated_at,
        } for task in tasks]
        requested_total = sum((Decimal(str(task.requested_quantity or 0)) for task in tasks), Decimal("0"))
        picked_total = sum((Decimal(str(task.picked_quantity or 0)) for task in tasks), Decimal("0"))
        pickup_progress = {
            "task_count": len(tasks),
            "requested_quantity": float(requested_total),
            "picked_quantity": float(picked_total),
            "remaining_quantity": float(max(Decimal("0"), requested_total - picked_total)),
            "status": "COMPLETED" if tasks and all((task.status or "").upper() == "COMPLETED" for task in tasks)
                else ("PARTIAL" if picked_total > 0 else ("ASSIGNED" if tasks else "PENDING")),
        }

        responses.append(
            AssemblyRequisitionResponse(
                id=str(r.id),
                requisition_number=r.requisition_number,
                warehouse_id=r.warehouse_id,
                department=r.department,
                requested_by=r.requested_by,
                priority=r.priority,
                required_date=r.required_date,
                status=r.status,
                assigned_store_id=str(r.assigned_store_id) if r.assigned_store_id else None,
                assigned_store_code=r.assigned_store_code,
                assigned_store_name=r.assigned_store_name,
                assigned_by=r.assigned_by,
                assigned_at=r.assigned_at,
                remarks=r.remarks,
                items=item_schemas,
                all_items_available=all_available,
                can_assign_store=can_assign,
                availability_status=avail_status,
                availability_message=avail_msg,
                pickup_tracking=tracking,
                pickup_progress=pickup_progress,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
        )

    return responses


@router.get("", response_model=List[AssemblyRequisitionResponse])
async def list_assembly_requisitions(
    department: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    uow: UnitOfWork = Depends(get_uow),
    user: CurrentUser = Depends(get_current_user),
):
    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items))
    roles = [r.upper() for r in (user.roles or [])]

    if "ASSEMBLY" in roles and not any(r in ["ADMIN", "SUPERUSER", "WAREHOUSE", "WAREHOUSE_MANAGER"] for r in roles):
        stmt = stmt.where(func.lower(AssemblyRequisitionModel.department) == "assembly")
    elif department:
        stmt = stmt.where(func.lower(AssemblyRequisitionModel.department) == department.strip().lower())

    if status_filter and status_filter.upper() != "ALL":
        stmt = stmt.where(func.upper(AssemblyRequisitionModel.status) == status_filter.strip().upper())

    stmt = stmt.order_by(AssemblyRequisitionModel.created_at.desc())
    res = await uow.session.execute(stmt)
    records = res.scalars().all()

    return await _build_requisition_responses_with_availability(records, uow.session)


@router.post("", response_model=AssemblyRequisitionResponse, status_code=status.HTTP_201_CREATED)
async def create_assembly_requisition(
    payload: CreateAssemblyRequisitionRequest,
    uow: UnitOfWork = Depends(get_uow),
    user: CurrentUser = Depends(get_current_user),
):
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requisition must contain at least one item",
        )

    now_utc = datetime.now(timezone.utc)
    current_year = now_utc.year

    # Generate sequential requisition number AR-YYYY-XXXX
    count_stmt = select(func.count(AssemblyRequisitionModel.id)).where(
        AssemblyRequisitionModel.requisition_number.like(f"AR-{current_year}-%")
    )
    count_res = await uow.session.execute(count_stmt)
    seq = (count_res.scalar() or 0) + 1
    req_number = f"AR-{current_year}-{seq:04d}"

    req = AssemblyRequisitionModel(
        id=uuid.uuid4(),
        requisition_number=req_number,
        warehouse_id=payload.warehouse_id,
        department=payload.department or "Assembly",
        requested_by=payload.requested_by or user.username or "Assembly Operator",
        priority=payload.priority.upper() if payload.priority else "MEDIUM",
        required_date=payload.required_date,
        status="PENDING",
        remarks=payload.remarks,
        created_at=now_utc,
        updated_at=now_utc,
    )
    uow.session.add(req)

    for it in payload.items:
        mat_uuid = None
        var_uuid = None
        is_custom = bool(
            it.is_custom
            or it.material_id == "CUSTOM"
            or (it.material_code or "").strip().upper() == "CUSTOM"
            or (not it.material_id and not it.material_code and (it.custom_material_name or it.material_name))
        )

        if is_custom:
            custom_name = (it.custom_material_name or it.material_name or "").strip()
            if not custom_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Custom material name is required for custom/new items.",
                )
            item_model = AssemblyRequisitionItemModel(
                id=uuid.uuid4(),
                requisition_id=req.id,
                material_id=None,
                material_variant_id=None,
                material_code="CUSTOM",
                variant_code=None,
                material_name=custom_name,
                custom_material_name=custom_name,
                requested_quantity=Decimal(str(it.quantity)),
                issued_quantity=Decimal("0.0"),
                uom=it.uom.strip().upper() if it.uom else "PCS",
                is_custom=True,
            )
        else:
            if it.material_id:
                try:
                    mat_uuid = uuid.UUID(it.material_id)
                except ValueError:
                    mat_uuid = None

            if it.material_variant_id:
                try:
                    var_uuid = uuid.UUID(it.material_variant_id)
                except ValueError:
                    var_uuid = None

            material_code = (it.material_code or "").strip()
            material_name = (it.material_name or "").strip()
            variant_code = it.variant_code.strip() if it.variant_code else None
            uom = it.uom.strip().upper() if it.uom else "PCS"

            if mat_uuid:
                mat_res = await uow.session.execute(
                    select(MaterialModel).options(selectinload(MaterialModel.variants)).where(MaterialModel.id == mat_uuid)
                )
                mat_obj = mat_res.scalar_one_or_none()
                if mat_obj:
                    material_code = mat_obj.material_code
                    material_name = material_name or mat_obj.material_name
                    uom = uom or mat_obj.base_uom or "PCS"
                    if var_uuid:
                        var_obj = next((v for v in (mat_obj.variants or []) if v.id == var_uuid), None)
                        if var_obj:
                            variant_code = var_obj.variant_code
                            uom = var_obj.uom or uom
                    elif mat_obj.variants:
                        active_vars = [v for v in mat_obj.variants if (v.status or "").lower() == "active"]
                        picked_v = active_vars[0] if active_vars else mat_obj.variants[0]
                        var_uuid = picked_v.id
                        variant_code = picked_v.variant_code
                        uom = picked_v.uom or uom
            elif material_code and material_code != "CUSTOM":
                mat_res = await uow.session.execute(
                    select(MaterialModel).options(selectinload(MaterialModel.variants)).where(MaterialModel.material_code == material_code)
                )
                mat_obj = mat_res.scalar_one_or_none()
                if mat_obj:
                    mat_uuid = mat_obj.id
                    material_name = material_name or mat_obj.material_name
                    uom = uom or mat_obj.base_uom or "PCS"
                    if var_uuid:
                        var_obj = next((v for v in (mat_obj.variants or []) if v.id == var_uuid), None)
                        if var_obj:
                            variant_code = var_obj.variant_code
                            uom = var_obj.uom or uom
                    elif mat_obj.variants:
                        active_vars = [v for v in mat_obj.variants if (v.status or "").lower() == "active"]
                        picked_v = active_vars[0] if active_vars else mat_obj.variants[0]
                        var_uuid = picked_v.id
                        variant_code = picked_v.variant_code
                        uom = picked_v.uom or uom
                        if var_obj:
                            variant_code = var_obj.variant_code
                            uom = var_obj.uom or uom
                    elif mat_obj.variants:
                        active_vars = [v for v in mat_obj.variants if (v.status or "").lower() == "active"]
                        picked_v = active_vars[0] if active_vars else mat_obj.variants[0]
                        var_uuid = picked_v.id
                        variant_code = picked_v.variant_code
                        uom = picked_v.uom or uom

            item_model = AssemblyRequisitionItemModel(
                id=uuid.uuid4(),
                requisition_id=req.id,
                material_id=mat_uuid,
                material_variant_id=var_uuid,
                material_code=material_code or "MAT-REQ",
                variant_code=variant_code,
                material_name=material_name or "Material",
                custom_material_name=None,
                requested_quantity=Decimal(str(it.quantity)),
                issued_quantity=Decimal("0.0"),
                uom=uom,
                is_custom=False,
            )
        uow.session.add(item_model)

    # Notify Warehouse of new Assembly Material Requisition
    notif = NotificationModel(
        id=uuid.uuid4(),
        user_role="WAREHOUSE",
        title=f"New Assembly Requisition: {req.requisition_number}",
        message=f"Assembly submitted requisition {req.requisition_number} ({len(payload.items)} items). Requires store assignment.",
        link="/warehouse/assembly-requisitions",
        is_read=False,
    )
    uow.session.add(notif)

    await uow.commit()

    # Refresh
    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req.id
    )
    res = await uow.session.execute(stmt)
    created_req = res.scalar_one()

    responses = await _build_requisition_responses_with_availability([created_req], uow.session)
    return responses[0]


@router.get("/{id}", response_model=AssemblyRequisitionResponse)
async def get_assembly_requisition(
    id: str,
    uow: UnitOfWork = Depends(get_uow),
    user: CurrentUser = Depends(get_current_user),
):
    try:
        req_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Requisition UUID")

    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req_uuid
    )
    res = await uow.session.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembly Requisition not found")

    responses = await _build_requisition_responses_with_availability([req], uow.session)
    return responses[0]


@router.post("/{id}/items/{item_id}/create-material", response_model=AssemblyRequisitionResponse)
async def create_material_for_assembly_requisition_item(
    id: str,
    item_id: str,
    payload: CreateMaterialForRequisitionItemRequest = CreateMaterialForRequisitionItemRequest(),
    uow: UnitOfWork = Depends(get_uow),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Warehouse action to create a Material Master record for a custom/new material request line
    and link it to this requisition line.
    """
    roles = [r.upper() for r in (user.roles or [])]
    if not any(r in ["WAREHOUSE", "WAREHOUSE_MANAGER", "ADMIN", "SUPERUSER"] for r in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Warehouse personnel or Admins can create and register new materials.",
        )

    try:
        req_uuid = uuid.UUID(id)
        item_uuid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UUID format")

    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req_uuid
    )
    res = await uow.session.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembly Requisition not found")

    target_item = next((it for it in req.items if it.id == item_uuid), None)
    if not target_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisition item not found")

    if not target_item.is_custom and target_item.material_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Item is already associated with Material '{target_item.material_code}'.",
        )

    # Determine material name, base UOM, category
    material_name = (
        payload.material_name or target_item.custom_material_name or target_item.material_name or ""
    ).strip()
    if not material_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Material name is required")

    base_uom = (payload.base_uom or target_item.uom or "PCS").strip().upper()
    category = (payload.category or "Raw Materials").strip()

    # Generate sequential material code using canonical logic
    import re
    codes_stmt = select(MaterialModel.material_code)
    codes_res = await uow.session.execute(codes_stmt)
    codes = codes_res.scalars().all()
    max_seq = 0
    for code in codes:
        if not code:
            continue
        match = re.match(r"^MAT-(\d+)$", code.strip(), re.IGNORECASE)
        if match:
            try:
                seq = int(match.group(1))
                if seq > max_seq:
                    max_seq = seq
            except (ValueError, TypeError):
                pass

    next_mat_code = f"MAT-{(max_seq + 1):03d}"
    next_var_code = f"{next_mat_code}-V001"

    now_time = datetime.now()
    # Check if duplicate material name already exists in Material Master
    existing_name_stmt = select(MaterialModel).where(func.lower(MaterialModel.material_name) == material_name.lower())
    existing_name_res = await uow.session.execute(existing_name_stmt)
    existing_mat = existing_name_res.scalar_one_or_none()

    if existing_mat:
        new_material = existing_mat
        var_stmt = select(MaterialVariantModel).where(MaterialVariantModel.material_id == new_material.id)
        var_res = await uow.session.execute(var_stmt)
        variants = var_res.scalars().all()
        new_variant = variants[0] if variants else None
        if not new_variant:
            new_variant = MaterialVariantModel(
                id=uuid.uuid4(),
                material_id=new_material.id,
                variant_code=f"{new_material.material_code}-V001",
                uom=new_material.base_uom,
                status="Active",
                created_at=now_time,
                updated_at=now_time,
            )
            uow.session.add(new_variant)
    else:
        new_material = MaterialModel(
            id=uuid.uuid4(),
            material_code=next_mat_code,
            material_name=material_name,
            category=category,
            description=payload.description or f"Created from Assembly Requisition {req.requisition_number}",
            base_uom=base_uom,
            status="Active",
            created_by=user.username or "warehouse",
            updated_by=user.username or "warehouse",
            created_at=now_time,
            updated_at=now_time,
        )
        uow.session.add(new_material)

        new_variant = MaterialVariantModel(
            id=uuid.uuid4(),
            material_id=new_material.id,
            variant_code=next_var_code,
            uom=base_uom,
            status="Active",
            created_at=now_time,
            updated_at=now_time,
        )
        uow.session.add(new_variant)

    await uow.session.flush()

    # Associate created material with requisition line
    target_item.material_id = new_material.id
    target_item.material_variant_id = new_variant.id
    target_item.material_code = new_material.material_code
    target_item.variant_code = new_variant.variant_code
    target_item.material_name = new_material.material_name
    target_item.uom = base_uom
    target_item.is_custom = False

    await uow.commit()

    # Re-fetch and return updated requisition
    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req.id
    )
    res = await uow.session.execute(stmt)
    updated_req = res.scalar_one()

    responses = await _build_requisition_responses_with_availability([updated_req], uow.session)
    return responses[0]


@router.post("/{id}/items/{item_id}/link-material", response_model=AssemblyRequisitionResponse)
async def link_material_for_assembly_requisition_item(
    id: str,
    item_id: str,
    payload: LinkMaterialToRequisitionItemRequest,
    uow: UnitOfWork = Depends(get_uow),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Warehouse action to link an existing Material Master item to a requisition line.
    """
    roles = [r.upper() for r in (user.roles or [])]
    if not any(r in ["WAREHOUSE", "WAREHOUSE_MANAGER", "ADMIN", "SUPERUSER"] for r in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Warehouse personnel or Admins can link materials.",
        )

    try:
        req_uuid = uuid.UUID(id)
        item_uuid = uuid.UUID(item_id)
        mat_uuid = uuid.UUID(payload.material_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UUID format")

    var_uuid = None
    if payload.material_variant_id:
        try:
            var_uuid = uuid.UUID(payload.material_variant_id)
        except ValueError:
            var_uuid = None

    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req_uuid
    )
    res = await uow.session.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembly Requisition not found")

    target_item = next((it for it in req.items if it.id == item_uuid), None)
    if not target_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requisition item not found")

    mat_stmt = select(MaterialModel).options(selectinload(MaterialModel.variants)).where(MaterialModel.id == mat_uuid)
    mat_res = await uow.session.execute(mat_stmt)
    mat_obj = mat_res.scalar_one_or_none()
    if not mat_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected Material Master item not found")

    var_obj = None
    if var_uuid:
        var_obj = next((v for v in (mat_obj.variants or []) if v.id == var_uuid), None)
    elif mat_obj.variants:
        var_obj = mat_obj.variants[0]
        var_uuid = var_obj.id

    target_item.material_id = mat_obj.id
    target_item.material_variant_id = var_uuid
    target_item.material_code = mat_obj.material_code
    target_item.variant_code = var_obj.variant_code if var_obj else None
    target_item.material_name = mat_obj.material_name
    target_item.uom = (var_obj.uom if var_obj else mat_obj.base_uom) or target_item.uom
    target_item.is_custom = False

    await uow.commit()

    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req.id
    )
    res = await uow.session.execute(stmt)
    updated_req = res.scalar_one()

    responses = await _build_requisition_responses_with_availability([updated_req], uow.session)
    return responses[0]


@router.post("/{id}/assign-store")
async def assign_store_to_assembly_requisition(
    id: str,
    payload: AssignStoreToRequisitionRequest,
    uow: UnitOfWork = Depends(get_uow),
    user: CurrentUser = Depends(get_current_user),
):
    roles = [r.upper() for r in (user.roles or [])]
    if not any(r in ["WAREHOUSE", "WAREHOUSE_MANAGER", "ADMIN", "SUPERUSER"] for r in roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only authorized Warehouse personnel can assign stores to Assembly Requisitions.",
        )

    try:
        req_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Requisition UUID")

    try:
        store_uuid = uuid.UUID(payload.store_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Store UUID")

    stmt = select(AssemblyRequisitionModel).options(selectinload(AssemblyRequisitionModel.items)).where(
        AssemblyRequisitionModel.id == req_uuid
    )
    res = await uow.session.execute(stmt)
    req = res.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assembly Requisition not found")

    # Availability Validation: Ensure all requested material quantities are in stock
    shortages = []
    for item in req.items:
        if getattr(item, "is_custom", False) or item.material_code == "CUSTOM" or not item.material_id:
            shortages.append(
                f"Custom/New material '{item.custom_material_name or item.material_name}' must be created in Material Master first."
            )
            continue

        stock_res = await uow.session.execute(
            select(MaterialStockModel).where(MaterialStockModel.material_code == item.material_code)
        )
        stock = stock_res.scalar_one_or_none()

        quar_stmt = select(func.coalesce(func.sum(QuarantineRecordModel.damaged_quantity), Decimal("0.0"))).where(
            QuarantineRecordModel.item_code == item.material_code,
            QuarantineRecordModel.status.in_(["PENDING_REVIEW", "QUARANTINED"]),
        )
        quar_res = await uow.session.execute(quar_stmt)
        quarantined_qty = quar_res.scalar() or Decimal("0.0")

        loc_bal_stmt = select(func.coalesce(func.sum(InventoryLocationBalanceModel.available_quantity), Decimal("0.0"))).where(
            InventoryLocationBalanceModel.material_code == item.material_code
        )
        loc_bal_res = await uow.session.execute(loc_bal_stmt)
        loc_avail = loc_bal_res.scalar() or Decimal("0.0")

        stk_avail = max(Decimal("0.0"), (stock.available if stock else Decimal("0.0")) - quarantined_qty)
        effective_avail = max(stk_avail, loc_avail)

        if effective_avail < item.requested_quantity:
            shortages.append(
                f"Material '{item.material_code}' ({item.material_name}): Required {item.requested_quantity} {item.uom}, Available {effective_avail} {item.uom}"
            )

    if shortages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Material shortage — Store assignment unavailable: {'; '.join(shortages)}",
        )

    store_stmt = select(StoreModel).where(StoreModel.id == store_uuid)
    store_res = await uow.session.execute(store_stmt)
    store = store_res.scalar_one_or_none()
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned Store not found")
    if store.status.upper() != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Store '{store.store_name}' is inactive.")

    now_utc = datetime.now(timezone.utc)

    req.assigned_store_id = store.id
    req.assigned_store_code = store.store_code
    req.assigned_store_name = store.store_name
    req.assigned_by = user.username or "warehouse"
    req.assigned_at = now_utc
    req.status = "ASSIGNED_TO_STORE"
    req.updated_at = now_utc

    tasks_created = []
    for item in req.items:
        existing_pck_res = await uow.session.execute(
            select(PickupTaskModel).where(
                PickupTaskModel.requisition_id == req.id,
                PickupTaskModel.material_code == item.material_code,
            )
        )
        pck = existing_pck_res.scalar_one_or_none()
        if not pck:
            task_no = f"PCK-{now_utc.year}-{uuid.uuid4().hex[:6].upper()}"
            pck = PickupTaskModel(
                id=uuid.uuid4(),
                task_number=task_no,
                requisition_id=req.id,
                requisition_number=req.requisition_number,
                store_id=store.id,
                store_code=store.store_code,
                store_name=store.store_name,
                department=req.department or "Assembly",
                material_code=item.material_code,
                material_name=item.material_name,
                requested_quantity=item.requested_quantity,
                picked_quantity=Decimal("0.0"),
                uom=item.uom or "PCS",
                priority=req.priority or "MEDIUM",
                required_date=req.required_date,
                status="ASSIGNED_TO_STORE",
                assigned_by=user.username or "warehouse",
                assigned_at=now_utc,
                created_at=now_utc,
                updated_at=now_utc,
            )
            uow.session.add(pck)
        else:
            pck.store_id = store.id
            pck.store_code = store.store_code
            pck.store_name = store.store_name
            pck.status = "ASSIGNED_TO_STORE"
            pck.updated_at = now_utc
        tasks_created.append(pck)

    # Targeted store notification to STR:<store_code>
    notif = NotificationModel(
        id=uuid.uuid4(),
        user_role=f"STR:{store.store_code}",
        title=f"New Pickup Task Assigned — {store.store_name}",
        message=f"Assembly Requisition {req.requisition_number} ({len(req.items)} items) assigned to {store.store_name}.",
        link="/my-store",
        is_read=False,
    )
    uow.session.add(notif)

    # Targeted notification to STORE_KEEPER
    notif_sk = NotificationModel(
        id=uuid.uuid4(),
        user_role="STORE_KEEPER",
        title=f"New Pickup Task — {store.store_code}",
        message=f"Assembly Requisition {req.requisition_number} assigned to {store.store_name}.",
        link="/my-store",
        is_read=False,
    )
    uow.session.add(notif_sk)

    await uow.commit()

    return {
        "status": "success",
        "requisition_number": req.requisition_number,
        "assigned_store": {
            "id": str(store.id),
            "store_code": store.store_code,
            "store_name": store.store_name,
        },
        "tasks": [{"id": str(t.id), "task_number": t.task_number} for t in tasks_created],
    }
