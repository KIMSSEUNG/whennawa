from dataclasses import dataclass

from core.model_settings import ModelStageSettings, load_model_settings
from services.embedding_service import EmbeddingService, build_embedding_service
from services.llm_service import LLMService, build_llm_service
from services.ocr_service import OCRService, build_ocr_service


@dataclass(slots=True)
class ModelStageServices:
    settings: ModelStageSettings
    ocr: OCRService
    embedding: EmbeddingService
    llm: LLMService


def build_model_stage_services() -> ModelStageServices:
    # 세 단계 모델 설정을 한 번에 묶는 진입점이다.
    settings = load_model_settings()
    return ModelStageServices(
        settings=settings,
        ocr=build_ocr_service(settings.ocr),
        embedding=build_embedding_service(settings.embedding),
        llm=build_llm_service(settings.llm),
    )
