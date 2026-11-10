import asyncio
from io import BytesIO

import pytest
from fastapi import UploadFile
from starlette.datastructures import Headers

from app.common.domain.exceptions import DomainRuleViolationException
from app.modules.procurement.domain.supplier import SupplierDocument
from app.modules.procurement.infrastructure.api.router import upload_supplier_document


@pytest.mark.parametrize(
    "filename,mime",
    [("certificate.pdf", "application/pdf"), ("CERTIFICATE.PDF", ""),
     ("scan.png", "image/png"), ("cheque.jpg", "image/jpeg"),
     ("certificate", "application/pdf"), ("sheet.xlsx", "application/octet-stream"),
     ("archive.zip", "application/zip"), ("program.exe", "application/octet-stream"),
     ("no-extension", "")],
)
def test_uploaded_document_is_accepted_during_registration(tmp_path, monkeypatch, filename, mime):
    monkeypatch.chdir(tmp_path)
    upload = UploadFile(filename=filename, file=BytesIO(b"document"),
                        headers=Headers({"content-type": mime}))
    metadata = asyncio.run(upload_supplier_document("GST Certificate", upload))
    document = SupplierDocument(**metadata)
    assert document.file_name == filename
    assert document.file_size == 8


def test_registration_keeps_document_size_limit():
    with pytest.raises(DomainRuleViolationException, match="20 MB"):
        SupplierDocument("GST Certificate", "certificate.pdf", "/media/certificate.pdf",
                         file_size=20 * 1024 * 1024 + 1)
