from pydantic import BaseModel, ConfigDict, Field, StrictStr

MAX_IMAGE_BYTES = 5_242_880
MAX_ENCODED_LENGTH = 4 * ((MAX_IMAGE_BYTES + 2) // 3)


class ImageDto(BaseModel):
    model_config = ConfigDict(extra="forbid")
    imageBase64: StrictStr = Field(min_length=1, max_length=MAX_ENCODED_LENGTH)


class ComparisonDto(BaseModel):
    model_config = ConfigDict(extra="forbid")
    referenceBase64: StrictStr = Field(min_length=1, max_length=MAX_ENCODED_LENGTH)
    candidateBase64: StrictStr = Field(min_length=1, max_length=MAX_ENCODED_LENGTH)
