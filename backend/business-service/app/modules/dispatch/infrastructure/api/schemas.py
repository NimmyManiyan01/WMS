from __future__ import annotations
from pydantic import BaseModel, Field
from datetime import datetime

class DispatchItemResponse(BaseModel):
    id: str
    material_code: str
    material_name: str
    quantity_ordered: float
    quantity_available: float
    quantity_reserved: float
    quantity_picked: float
    quantity_packed: float
    quantity_loaded: float
    quantity_pending: float
    uom: str
    status: str

    class Config:
        from_attributes = True

class DispatchOrderResponse(BaseModel):
    id: str
    dispatch_number: str
    order_number: str
    customer_name: str
    warehouse_id: str
    status: str
    items: list[DispatchItemResponse] = Field(default_factory=list)
    driver_id: str | None = None
    vehicle_id: str | None = None
    route_code: str | None = None
    delivery_address: str | None = None
    destination: str | None = None
    scheduled_date: datetime | None = None
    expected_delivery_date: datetime | None = None
    priority: str = "Normal"
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DispatchListResponse(BaseModel):
    items: list[DispatchOrderResponse]
    total: int

class DriverResponse(BaseModel):
    id: str
    driver_name: str
    license_number: str
    phone: str
    email: str | None = None
    status: str
    rating: float
    assigned_vehicle_id: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class VehicleResponse(BaseModel):
    id: str
    vehicle_number: str
    vehicle_type: str
    capacity_tons: float
    status: str
    current_driver_id: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
