"""
Finance API exports
"""
from app.modules.finance.infrastructure.api.router import router as finance_router

__all__ = ["finance_router"]
