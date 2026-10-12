import datetime
from typing import List
from pydantic import BaseModel, ConfigDict


class AvailableSlot(BaseModel):
    start_time: datetime.datetime
    end_time: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AvailableSlotsResponse(BaseModel):
    professional_id: int
    service_id: int
    date: datetime.date
    duration_minutes: int
    slots: List[AvailableSlot] = []

    model_config = ConfigDict(from_attributes=True)

    def __iter__(self):
        return iter(self.slots)

    def __len__(self):
        return len(self.slots)

    def __getitem__(self, item):
        return self.slots[item]
