from typing import Annotated, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class DataModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


Score = Annotated[int, Field(strict=True, ge=0, le=10)]
ContextText = Annotated[str, StringConstraints(max_length=1200)]
Category = Literal[
    "abusive", "unconstructive_criticism", "constructive_criticism",
    "supportive", "neutral", "context_required",
]
Purpose = Literal[
    "information", "question", "answer", "elaboration", "agreement",
    "disagreement", "proposal", "advice", "appreciation", "empathy",
    "encouragement", "humor", "emotional_reaction", "other",
]
HarmLabel = Literal[
    "personal_attack", "insult", "threat", "identity_hate", "violence_incitation",
    "sexual_harassment", "provocation", "exclusion", "profanity",
]


class ReplyContext(DataModel):
    isReply: bool = False
    parentText: ContextText = ""
    threadRootText: ContextText = ""


class ContentContext(DataModel):
    videoId: str = Field("", pattern=r"^(?:[A-Za-z0-9_-]{11})?$")
    title: str = Field("", max_length=300)
    description: ContextText = ""
    sourceText: ContextText = ""


class InputContext(DataModel):
    platform: Literal["unknown", "x", "youtube"] = "unknown"
    reply: ReplyContext = Field(default_factory=ReplyContext)
    content: ContentContext = Field(default_factory=ContentContext)


class AnalyzeRequest(DataModel):
    text: str = Field(min_length=2, max_length=5000)
    context: InputContext = Field(default_factory=InputContext)
    summarizeVideos: bool = True
    allowDemo: bool = True
    session_id: Optional[UUID] = None


class DiscoursePurpose(DataModel):
    primary: Purpose
    secondary: List[Purpose] = Field(max_length=3)


class Harm(DataModel):
    severity: Score
    labels: List[HarmLabel] = Field(max_length=5)
    target: Literal["individual", "group", "organization", "work", "policy",
                    "behavior", "self", "none", "unclear"]


class DialogueStyle(DataModel):
    respect: Score
    hostility: Score
    openness: Score
    generalization: Score


class Constructiveness(DataModel):
    specificity: Score
    evidence: Score
    solutionOrientation: Score
    actionability: Score


class Prosocial(DataModel):
    empathy: Score
    support: Score
    appreciation: Score


class ContextEvaluation(DataModel):
    quality: Literal["full", "partial", "insufficient"]
    replyRelation: Literal["not_reply", "agreement", "constructive_disagreement",
                           "correction", "answer", "emotional_support", "elaboration",
                           "negative_reaction", "mockery", "unclear"]
    contentRelation: Literal["not_applicable", "on_topic", "supports_content",
                             "challenges_content", "adds_information", "unrelated",
                             "cannot_determine"]


class GeminiAnalysis(DataModel):
    discoursePurpose: DiscoursePurpose
    harm: Harm
    dialogueStyle: DialogueStyle
    constructiveness: Constructiveness
    prosocial: Prosocial
    context: ContextEvaluation
    confidence: Score
    reason: str = Field(min_length=1, max_length=200)
    suggestion: str = Field(max_length=280)
    rationaleSpans: List[Annotated[str, StringConstraints(max_length=80)]] = Field(max_length=3)


class Analysis(GeminiAnalysis):
    category: Category
    toxicity: Score
    constructivenessScore: Score
    empathyScore: Score


class VideoSummary(DataModel):
    summary: str = Field(min_length=1, max_length=700)
    topics: List[Annotated[str, StringConstraints(max_length=160)]] = Field(max_length=6)
    keyClaims: List[Annotated[str, StringConstraints(max_length=160)]] = Field(max_length=6)
    sensitiveTopics: List[Annotated[str, StringConstraints(max_length=160)]] = Field(max_length=6)


class ContextUsed(DataModel):
    reply: bool
    threadRoot: bool
    content: bool
    video: Literal["none", "gemini_video", "page_metadata"]


class AnalyzeResponse(DataModel):
    analysis: Analysis
    analysis_id: Optional[str] = None
    demo: bool
    contextUsed: ContextUsed
