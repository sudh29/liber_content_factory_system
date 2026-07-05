"""
OpenTelemetry Setup for ADK Agents.

Provides tracing and logging infrastructure for the Content Factory pipeline.
Uses Google Cloud Trace if configured, or Console/OTLP exporters otherwise.
"""

import os
from contextlib import asynccontextmanager

from opentelemetry import trace
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter



def setup_telemetry() -> TracerProvider:
    """Configures OpenTelemetry and applies instrumentation."""
    
    resource = Resource.create({
        "service.name": "liber-content-factory",
        "service.version": "1.0.0",
        "deployment.environment": os.environ.get("ENV", "development"),
    })

    provider = TracerProvider(resource=resource)
    
    if os.environ.get("ENABLE_GCP_TRACING", "false").lower() == "true":
        # Google Cloud Trace
        exporter = CloudTraceSpanExporter()
        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)
        print("Telemetry configured: Google Cloud Trace Exporter")
    elif os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
        # standard OTLP (e.g. Jaeger, Phoenix, AgentOps)
        exporter = OTLPSpanExporter()
        processor = BatchSpanProcessor(exporter)
        provider.add_span_processor(processor)
        print("Telemetry configured: OTLP Exporter")
    else:
        # Default to console in development
        if os.environ.get("ENV", "development") == "development":
            processor = BatchSpanProcessor(ConsoleSpanExporter())
            provider.add_span_processor(processor)
            print("Telemetry configured: Console Exporter")

    # Set as global trace provider
    trace.set_tracer_provider(provider)

    return provider


@asynccontextmanager
async def tracing_scope():
    """Async context manager to initialize and cleanup telemetry."""
    provider = setup_telemetry()
    try:
        yield provider
    finally:
        # Force flush any remaining spans before exit
        provider.force_flush()
