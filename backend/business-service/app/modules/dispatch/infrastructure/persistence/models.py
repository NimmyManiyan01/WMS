"""
SQLAlchemy ORM models for Outbound Dispatch and Gate Exit module.
"""
from __future__ import annotations

from datetime import datetime, timezone
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, GUID


class OutboundDispatchModel(Base):
    __tablename__ = "outbound_dispatch"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    dispatch_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(128), nullable=False)
    order_reference: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    vehicle_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    driver_name: Mapped[str] = mapped_column(String(128), nullable=False)
    driver_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    loading_status: Mapped[str] = mapped_column(String(32), default="LOADING_COMPLETED", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="READY_FOR_GATE_EXIT", index=True, nullable=False)
    items_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    destination_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    seal_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    eway_bill: Mapped[str | None] = mapped_column(String(64), nullable=True)
    transporter: Mapped[str | None] = mapped_column(String(128), nullable=True)
    gross_weight: Mapped[str | None] = mapped_column(String(64), nullable=True)
    dock_bay: Mapped[str | None] = mapped_column(String(32), nullable=True)
    warehouse_id: Mapped[str] = mapped_column(String(64), default="WH_PUNE-01", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    gate_exit: Mapped["OutboundGateExitModel | None"] = relationship(
        "OutboundGateExitModel", back_populates="dispatch", uselist=False, cascade="all, delete-orphan"
    )
    exceptions: Mapped[list["OutboundGateExitExceptionModel"]] = relationship(
        "OutboundGateExitExceptionModel",
        back_populates="dispatch",
        order_by="desc(OutboundGateExitExceptionModel.created_at)",
        cascade="all, delete-orphan",
    )


class OutboundGateExitModel(Base):
    __tablename__ = "outbound_gate_exit"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    dispatch_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("outbound_dispatch.id", ondelete="RESTRICT"), nullable=False, unique=True, index=True)
    security_officer_id: Mapped[str] = mapped_column(String(128), nullable=False)
    vehicle_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    driver_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="EXIT_COMPLETED", nullable=False)
    exit_completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    dispatch: Mapped[OutboundDispatchModel] = relationship("OutboundDispatchModel", back_populates="gate_exit")


class OutboundGateExitExceptionModel(Base):
    __tablename__ = "outbound_gate_exit_exception"

    id: Mapped[uuid.UUID] = mapped_column(GUID, primary_key=True, default=uuid.uuid4)
    dispatch_id: Mapped[uuid.UUID] = mapped_column(GUID, ForeignKey("outbound_dispatch.id", ondelete="CASCADE"), nullable=False, index=True)
    dispatch_number: Mapped[str] = mapped_column(String(64), nullable=False)
    expected_vehicle: Mapped[str] = mapped_column(String(64), nullable=False)
    expected_driver: Mapped[str] = mapped_column(String(128), nullable=False)
    actual_vehicle: Mapped[str | None] = mapped_column(String(64), nullable=True)
    actual_driver: Mapped[str | None] = mapped_column(String(128), nullable=True)
    verification_result: Mapped[str] = mapped_column(String(64), nullable=False)  # VEHICLE_MISMATCH, DRIVER_MISMATCH, BOTH_MISMATCH
    mismatch_reason: Mapped[str] = mapped_column(Text, nullable=False)
    security_officer_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="ACTION_REQUIRED", index=True, nullable=False)
    resolution_action: Mapped[str | None] = mapped_column(String(32), nullable=True)  # UPDATE_MANIFEST, CONFIRM_CLEARED
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    dispatch: Mapped[OutboundDispatchModel] = relationship("OutboundDispatchModel", back_populates="exceptions")

