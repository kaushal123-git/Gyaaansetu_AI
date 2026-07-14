import asyncio
import os
import sys

# Add backend directory to python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.orchestrator import GyaanSetuOrchestrator
from unittest.mock import patch

async def main():
    print("=========================================")
    print("Testing GERA Engine Resilience & Fallbacks")
    print("=========================================")

    # Test Case 1: Gemini Failover to Llama 3.1
    print("\n--- Test Case 1: Gemini API fails, GERA falls back to Ollama ---")
    
    os.environ["GEMINI_API_KEY"] = "mock_key_triggers_cloud_path"
    
    async def mock_stream_chat(*args, **kwargs):
        yield "Llama 3.1 offline response token 1"
        yield " Llama 3.1 offline response token 2"
        
    with patch("httpx.AsyncClient.stream") as mock_stream:
        # Mock httpx to raise exception (representing API failure or network issue)
        mock_stream.side_effect = Exception("Gemini API Timeout / Rate Limit")
        
        with patch("services.ollama_service.stream_chat", side_effect=mock_stream_chat):
            tokens = []
            trace = None
            async for token in GyaanSetuOrchestrator.route_and_generate(
                fused_prompt="Test prompt",
                task="tutor",
                mode="Deep Learning",
                language="English"
            ):
                if token.startswith("__TRACE_JSON_METADATA__"):
                    import json
                    trace = json.loads(token.replace("__TRACE_JSON_METADATA__", ""))
                else:
                    tokens.append(token)
            
            response_text = "".join(tokens)
            print("Response:", response_text)
            print("Trace Model Routed:", trace["model_routing"]["routed_model"])
            print("GERA Health Status:", trace["gera_engine"]["health_status"])
            print("GERA Failovers Attempted:", trace["gera_engine"]["failovers_attempted"])
            assert trace["model_routing"]["routed_model"] in ["llama3.1:8b", "Llama 3.1:8b"]
            assert "Gemini Cloud Failed (429 or Timeout)" in trace["gera_engine"]["failovers_attempted"]
            print("✅ Test Case 1 Passed!")

    # Test Case 2: Ollama model fails, GERA falls back to Phi-3
    print("\n--- Test Case 2: Ollama model fails, GERA falls back to Phi-3 ---")
    
    # Remove key to make it default to local
    if "GEMINI_API_KEY" in os.environ:
        del os.environ["GEMINI_API_KEY"]
        
    call_count = 0
    async def mock_stream_chat_fail_then_succeed(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise Exception("Llama model not loaded / Ollama serve offline")
        else:
            yield "Phi-3 fallback token"

    with patch("services.ollama_service.stream_chat", side_effect=mock_stream_chat_fail_then_succeed):
        tokens = []
        trace = None
        async for token in GyaanSetuOrchestrator.route_and_generate(
            fused_prompt="Test prompt",
            task="tutor",
            mode="Deep Learning",
            language="English"
        ):
            if token.startswith("__TRACE_JSON_METADATA__"):
                import json
                trace = json.loads(token.replace("__TRACE_JSON_METADATA__", ""))
            else:
                tokens.append(token)
                
        response_text = "".join(tokens)
        print("Response:", response_text)
        print("Trace Model Routed:", trace["model_routing"]["routed_model"])
        print("GERA Health Status:", trace["gera_engine"]["health_status"])
        print("GERA Failovers Attempted:", trace["gera_engine"]["failovers_attempted"])
        assert trace["model_routing"]["routed_model"] == "Phi-3 (GERA Fallback)"
        assert "Ollama llama3.1:8b Unreachable" in trace["gera_engine"]["failovers_attempted"]
        print("✅ Test Case 2 Passed!")

    # Test Case 3: Complete Offline Failure Alert
    print("\n--- Test Case 3: All local models offline, GERA yields Alert ---")
    
    async def mock_all_fail(*args, **kwargs):
        raise Exception("Ollama service stopped completely")

    with patch("services.ollama_service.stream_chat", side_effect=mock_all_fail):
        tokens = []
        trace = None
        async for token in GyaanSetuOrchestrator.route_and_generate(
            fused_prompt="Test prompt",
            task="tutor",
            mode="Deep Learning",
            language="English"
        ):
            if token.startswith("__TRACE_JSON_METADATA__"):
                import json
                trace = json.loads(token.replace("__TRACE_JSON_METADATA__", ""))
            else:
                tokens.append(token)
                
        response_text = "".join(tokens)
        print("Response:", response_text)
        print("Trace Model Routed:", trace["model_routing"]["routed_model"])
        print("GERA Health Status:", trace["gera_engine"]["health_status"])
        print("GERA Failovers Attempted:", trace["gera_engine"]["failovers_attempted"])
        assert "GyaanSetu Resilience Engine Alert" in response_text
        assert trace["gera_engine"]["health_status"] == "Degraded"
        print("✅ Test Case 3 Passed!")

    print("\n=========================================")
    print("All GERA Engine tests passed successfully!")
    print("=========================================")

if __name__ == "__main__":
    asyncio.run(main())
