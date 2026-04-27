from typing import Literal

from pydantic import BaseModel, Field


class JobPostRecentAnalysisItem(BaseModel):
    id: int
    companyName: str = ""
    targetPosition: str = ""
    essayEmotionText: str = ""
    essayFormalText: str = ""
    createdAt: str = ""


class JobPostAnalyzeResponse(BaseModel):
    companyName: str = ""
    position: str = ""
    info: list[str] = Field(default_factory=list)
    companyProfile: dict = Field(default_factory=dict)
    embeddingSourceText: str = ""
    ragContextText: str = ""
    essayEmotionText: str = ""
    essayFormalText: str = ""
    essayRawText: str = ""
    essayPromptUsed: str = ""
    llmProvider: str = ""
    llmModel: str = ""
    rawText: str = ""
    confidence: Literal["high", "medium", "low"] = "low"
    missingFields: list[str] = Field(default_factory=list)
    recentAnalyses: list[JobPostRecentAnalysisItem] = Field(default_factory=list)
