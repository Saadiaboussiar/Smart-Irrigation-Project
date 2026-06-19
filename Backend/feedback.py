from pydantic import BaseModel
from typing import Optional


class FeedbackRequest(BaseModel):

    prediction_id: str

