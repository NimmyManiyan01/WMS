from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.dispatch.application.commands import (
    CreateDispatchCommand,
    PickItemsCommand,
    PackItemsCommand,
    AllocateDriverCommand,
    AllocateVehicleCommand,
    AssignRouteCommand,
    CreateDriverCommand,
    CreateVehicleCommand,
)
from app.modules.dispatch.application.use_cases import DispatchUseCases
from app.modules.dispatch.infrastructure.persistence.repository_impl import (
    SQLAlchemyDispatchRepository,
    SQLAlchemyDriverRepository,
    SQLAlchemyVehicleRepository,
)
from app.modules.dispatch.infrastructure.api.schemas import (
    DispatchOrderResponse,
    DispatchItemResponse,
    DispatchListResponse,
    DriverResponse,
    VehicleResponse,
)
from app.security.dependencies import get_current_user, CurrentUser

router = APIRouter(tags=["Finished Goods Dispatch"])


def _to_dispatch_dto(o) -> DispatchOrderResponse:
    items = [
        DispatchItemResponse(
            id=i.id,
            material_code=i.material_code,
            material_name=i.material_name,
            quantity_ordered=i.quantity_ordered,
            quantity_available=i.quantity_available,
            quantity_reserved=i.quantity_reserved,
            quantity_picked=i.quantity_picked,
            quantity_packed=i.quantity_packed,
            quantity_loaded=i.quantity_loaded,
            quantity_pending=i.quantity_pending,
            uom=i.uom,
            status=i.status,
        )
        for i in o.items
    ]
    return DispatchOrderResponse(
        id=o.id,
        dispatch_number=o.dispatch_number,
        order_number=o.order_number,
        customer_name=o.customer_name,
        warehouse_id=o.warehouse_id,
        status=o.status.value if hasattr(o.status, "value") else str(o.status),
        items=items,
        driver_id=o.driver_id,
        vehicle_id=o.vehicle_id,
        route_code=o.route_code,
        delivery_address=o.delivery_address,
        destination=o.destination,
        scheduled_date=o.scheduled_date,
        expected_delivery_date=o.expected_delivery_date,
        priority=o.priority,
        notes=o.notes,
        created_at=o.created_at,
        updated_at=o.updated_at,
    )


def _to_driver_dto(d) -> DriverResponse:
    return DriverResponse(
        id=d.id,
        driver_name=d.driver_name,
        license_number=d.license_number,
        phone=d.phone,
        email=d.email,
        status=d.status.value if hasattr(d.status, "value") else str(d.status),
        rating=d.rating,
        assigned_vehicle_id=d.assigned_vehicle_id,
        created_at=d.created_at,
        updated_at=d.updated_at,
    )


def _to_vehicle_dto(v) -> VehicleResponse:
    return VehicleResponse(
        id=v.id,
        vehicle_number=v.vehicle_number,
        vehicle_type=v.vehicle_type,
        capacity_tons=v.capacity_tons,
        status=v.status.value if hasattr(v.status, "value") else str(v.status),
        current_driver_id=v.current_driver_id,
        created_at=v.created_at,
        updated_at=v.updated_at,
    )


def _get_use_cases(db: AsyncSession) -> DispatchUseCases:
    return DispatchUseCases(
        SQLAlchemyDispatchRepository(db),
        SQLAlchemyDriverRepository(db),
        SQLAlchemyVehicleRepository(db),
    )


@router.get("/api/dispatches/ready-for-gate-exit", response_model=list[DispatchOrderResponse])
async def get_ready_for_gate_exit(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    orders = await uc.get_ready_for_gate_exit()
    return [_to_dispatch_dto(o) for o in orders]


@router.get("/api/dispatches/kpis", response_model=dict)
async def get_dispatch_kpis(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    return await uc.get_kpis()


@router.get("/api/dispatches", response_model=DispatchListResponse)
async def list_dispatches(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
    status_filter: str | None = Query(None, alias="status"),
    warehouse_id: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    uc = _get_use_cases(db)
    items, total = await uc.list_dispatches(status=status_filter, warehouse_id=warehouse_id, skip=skip, limit=limit)
    return DispatchListResponse(
        items=[_to_dispatch_dto(o) for o in items],
        total=total,
    )


@router.post("/api/dispatches", response_model=DispatchOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_dispatch(
    cmd: CreateDispatchCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.create_dispatch(cmd)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/api/dispatches/{dispatch_id}", response_model=DispatchOrderResponse)
async def get_dispatch(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    order = await uc.get_dispatch(dispatch_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dispatch order not found")
    return _to_dispatch_dto(order)


@router.post("/api/dispatches/{dispatch_id}/reserve-stock", response_model=DispatchOrderResponse)
async def reserve_dispatch_stock(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.reserve_stock(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/picking", response_model=DispatchOrderResponse)
async def start_dispatch_picking(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.start_picking(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/pick-items", response_model=DispatchOrderResponse)
async def pick_dispatch_items(
    dispatch_id: str,
    cmd: PickItemsCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.pick_items(dispatch_id, cmd)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/pack", response_model=DispatchOrderResponse)
async def start_dispatch_packing(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.start_packing(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/pack-items", response_model=DispatchOrderResponse)
async def pack_dispatch_items(
    dispatch_id: str,
    cmd: PackItemsCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.pack_items(dispatch_id, cmd)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/driver", response_model=DispatchOrderResponse)
async def allocate_dispatch_driver(
    dispatch_id: str,
    cmd: AllocateDriverCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.allocate_driver(dispatch_id, cmd)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/vehicle", response_model=DispatchOrderResponse)
async def allocate_dispatch_vehicle(
    dispatch_id: str,
    cmd: AllocateVehicleCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.allocate_vehicle(dispatch_id, cmd)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/route", response_model=DispatchOrderResponse)
async def assign_dispatch_route(
    dispatch_id: str,
    cmd: AssignRouteCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.assign_route(dispatch_id, cmd)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/loading/start", response_model=DispatchOrderResponse)
async def start_dispatch_loading(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.start_loading(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/loading/verify", response_model=DispatchOrderResponse)
async def verify_dispatch_loading(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.verify_loading(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/verify", response_model=DispatchOrderResponse)
async def verify_dispatch_final(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.verify_final(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/dispatch", response_model=DispatchOrderResponse)
async def dispatch_order(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.dispatch_order(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/transit", response_model=DispatchOrderResponse)
async def transit_order(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.transit_order(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/deliver", response_model=DispatchOrderResponse)
async def deliver_order(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.deliver_order(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/close", response_model=DispatchOrderResponse)
async def close_order(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.close_order(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/cancel", response_model=DispatchOrderResponse)
async def cancel_order(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.cancel_order(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/api/dispatches/{dispatch_id}/return", response_model=DispatchOrderResponse)
async def return_order(
    dispatch_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        order = await uc.return_order(dispatch_id)
        await db.commit()
        return _to_dispatch_dto(order)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/api/drivers", response_model=list[DriverResponse])
async def list_drivers(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    drivers = await uc.list_drivers()
    return [_to_driver_dto(d) for d in drivers]


@router.post("/api/drivers", response_model=DriverResponse, status_code=status.HTTP_201_CREATED)
async def create_driver(
    cmd: CreateDriverCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        driver = await uc.create_driver(cmd)
        await db.commit()
        return _to_driver_dto(driver)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/api/drivers/{driver_id}", response_model=DriverResponse)
async def update_driver(
    driver_id: str,
    cmd: CreateDriverCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        driver = await uc.update_driver(driver_id, cmd)
        await db.commit()
        return _to_driver_dto(driver)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/api/drivers/{driver_id}")
async def delete_driver(
    driver_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        await uc.delete_driver(driver_id)
        await db.commit()
        return {"status": "success", "message": f"Driver {driver_id} deleted"}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/api/vehicles", response_model=list[VehicleResponse])
async def list_vehicles(
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    vehicles = await uc.list_vehicles()
    return [_to_vehicle_dto(v) for v in vehicles]


@router.post("/api/vehicles", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    cmd: CreateVehicleCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        vehicle = await uc.create_vehicle(cmd)
        await db.commit()
        return _to_vehicle_dto(vehicle)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/api/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: str,
    cmd: CreateVehicleCommand,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        vehicle = await uc.update_vehicle(vehicle_id, cmd)
        await db.commit()
        return _to_vehicle_dto(vehicle)
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/api/vehicles/{vehicle_id}")
async def delete_vehicle(
    vehicle_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _user: CurrentUser = Depends(get_current_user),
):
    uc = _get_use_cases(db)
    try:
        await uc.delete_vehicle(vehicle_id)
        await db.commit()
        return {"status": "success", "message": f"Vehicle {vehicle_id} deleted"}
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

