from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Literal
from backend.database import get_db
from backend import schemas
from backend.auth import require_noc_handler
from backend import import_excel

router = APIRouter(prefix="/import", tags=["import"])


@router.post("/sites/preview", response_model=schemas.ImportPreview)
async def preview_sites(
    file: UploadFile = File(...),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.preview_xlsx(content, file.filename or "")


@router.post("/sites/confirm", response_model=schemas.ImportResult)
async def confirm_sites(
    file: UploadFile = File(...),
    mode: Literal["skip", "update"] = Query("skip"),
    db: Session = Depends(get_db),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.import_sites(content, db, mode, file.filename or "")


@router.post("/employees/preview", response_model=schemas.ImportPreview)
async def preview_employees(
    file: UploadFile = File(...),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.preview_xlsx(content, file.filename or "")


@router.post("/employees/confirm", response_model=schemas.ImportResult)
async def confirm_employees(
    file: UploadFile = File(...),
    mode: Literal["skip", "update"] = Query("skip"),
    db: Session = Depends(get_db),
    _=Depends(require_noc_handler),
):
    content = await file.read()
    return import_excel.import_employees(content, db, mode, file.filename or "")
