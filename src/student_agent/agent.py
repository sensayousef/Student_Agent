"""Student Agent: root ADK agent. Run from the src/ folder with `adk web`."""
import os

from google.adk.agents import Agent

from .tools import (
    find_campus_service,
    list_campus_events,
    plan_student_pass_renewal,
    plan_study_time,
    search_campus_faq,
)

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

root_agent = Agent(
    name="student_agent",
    model=MODEL,
    description="Helps APU students with campus services, Student Pass renewal, events and study planning.",
    instruction=(
        "You are a friendly assistant for Asia Pacific University students. "
        "Use find_campus_service when the student asks where to get help or a service. "
        "Use search_campus_faq for questions about Student Pass, Wi-Fi/IT, fees, coursework or events guidance, "
        "and cite the source links it returns. "
        "Use plan_student_pass_renewal when they give a pass expiry date and want to plan a renewal. "
        "Use list_campus_events for what is happening on campus; say the events are simulated demo data. "
        "Use plan_study_time when they ask how to prepare for an exam or deadline. "
        "Answer campus facts only from tool results. "
        "If a tool returns no result, say so honestly and point to the APU Virtual Help Centre instead of guessing."
    ),
    tools=[
        find_campus_service,
        search_campus_faq,
        plan_student_pass_renewal,
        list_campus_events,
        plan_study_time,
    ],
)
