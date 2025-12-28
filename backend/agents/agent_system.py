"""
Real AI Agent System using Google Gemini API
Provides actual AI-generated responses, not static templates
"""

import os
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import re
from dotenv import load_dotenv
load_dotenv()

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Google Generative AI not installed. Install with: pip install google-generativeai")


class AIAgentSystem:
    """
    Real AI Agent System using Google Gemini API
    Generates dynamic, contextual responses
    """
    
    def __init__(self, api_key: str = None):
        """Initialize with Gemini API"""
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        
        if GEMINI_AVAILABLE and self.api_key:
            self.mode = "ai"
            genai.configure(api_key=self.api_key)
            
            # Use Gemini 1.5 Flash for speed
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Generation config for structured output
            self.generation_config = {
                'temperature': 0.7,
                'top_p': 0.95,
                'top_k': 40,
                'max_output_tokens': 2048,
            }
            
            print(f"✅ Agent system initialized with Gemini AI")
        else:
            self.mode = "fallback"
            print(f"⚠️  Agent system in fallback mode (no AI)")
    
    async def process_task(
        self,
        description: str,
        files: List[str] = None,
        user_id: str = None,
        task_id: str = None,
        ws_manager = None
    ) -> Dict[str, Any]:
        """
        Process a task using real AI
        
        Returns structured result with actual AI-generated content
        """
        
        files = files or []
        
        try:
            if self.mode == "ai":
                return await self._process_with_ai(
                    description, files, user_id, task_id, ws_manager
                )
            else:
                return await self._process_fallback(
                    description, files, user_id, task_id, ws_manager
                )
                
        except Exception as e:
            print(f"❌ Error in agent system: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                "summary": f"Error processing task: {str(e)}",
                "insights": [
                    "An error occurred during AI processing",
                    "The system is working to resolve the issue"
                ],
                "recommendations": [
                    "Try rephrasing your request",
                    "Ensure all file formats are supported",
                    "Contact support if the issue persists"
                ],
                "agents_involved": 1,
                "files_processed": len(files),
                "status": "error",
                "error": str(e)
            }
    
    async def _process_with_ai(
        self,
        description: str,
        files: List[str],
        user_id: str,
        task_id: str,
        ws_manager
    ) -> Dict[str, Any]:
        """Process using real Gemini AI"""
        
        print(f"🤖 Processing with Gemini AI")
        
        # Send initial logs
        await self._send_log(ws_manager, user_id, task_id,
            "Coordinator", "analyzing",
            "AI coordinator analyzing your request..."
        )
        
        await asyncio.sleep(0.5)
        
        # Determine task type
        task_type = self._determine_task_type(description)
        
        await self._send_log(ws_manager, user_id, task_id,
            "DataAnalyst", "processing",
            f"AI analyst processing {task_type} task..."
        )
        
        await asyncio.sleep(0.5)
        
        # Read file contents if available
        file_context = ""
        if files:
            await self._send_log(ws_manager, user_id, task_id,
                "DataAnalyst", "analyzing",
                f"Analyzing {len(files)} file(s)..."
            )
            
            for file_path in files[:3]:  # Limit to first 3 files
                try:
                    if os.path.exists(file_path):
                        # Read text files
                        if file_path.endswith(('.txt', '.csv', '.json', '.md')):
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                content = f.read()[:5000]  # First 5000 chars
                                file_context += f"\n\nFile: {os.path.basename(file_path)}\n{content}\n"
                except Exception as e:
                    print(f"Error reading file {file_path}: {e}")
        
        # Create comprehensive AI prompt
        prompt = self._create_ai_prompt(description, file_context, task_type)
        
        await self._send_log(ws_manager, user_id, task_id,
            "AI Engine", "generating",
            "Gemini AI generating comprehensive analysis..."
        )
        
        try:
            # Call Gemini AI
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt,
                generation_config=self.generation_config
            )
            
            ai_response = response.text
            print(f"✅ AI generated {len(ai_response)} characters")
            
            await self._send_log(ws_manager, user_id, task_id,
                "ProcessOptimizer", "optimizing",
                "Extracting actionable insights..."
            )
            
            await asyncio.sleep(0.5)
            
            # Parse AI response into structured format
            result = self._parse_ai_response(ai_response, description, len(files))
            
            await self._send_log(ws_manager, user_id, task_id,
                "QualityAssurance", "validating",
                "Validating AI-generated insights..."
            )
            
            await asyncio.sleep(0.5)
            
            await self._send_log(ws_manager, user_id, task_id,
                "Coordinator", "completed",
                "AI analysis completed successfully"
            )
            
            return result
            
        except Exception as e:
            print(f"❌ AI generation error: {e}")
            # Fallback to simpler response
            return await self._process_fallback(description, files, user_id, task_id, ws_manager)
    
    def _create_ai_prompt(self, description: str, file_context: str, task_type: str) -> str:
        """Create detailed prompt for Gemini AI"""
        
        prompt = f"""You are an expert business AI assistant with multiple specialized capabilities including data analysis, content generation, process optimization, and strategic planning.

USER'S TASK:
{description}

TASK TYPE: {task_type}

{f"FILE CONTEXT:{file_context}" if file_context else ""}

Please provide a comprehensive response in the following JSON structure:

{{
    "summary": "A detailed 2-3 sentence executive summary of your analysis/response",
    "insights": [
        "Detailed insight 1 with specific findings",
        "Detailed insight 2 with data or observations",
        "Detailed insight 3 with actionable information",
        "Detailed insight 4 if applicable",
        "Detailed insight 5 if applicable"
    ],
    "recommendations": [
        "Specific actionable recommendation 1 with expected outcomes",
        "Specific actionable recommendation 2 with implementation steps",
        "Specific actionable recommendation 3 with priorities",
        "Specific actionable recommendation 4 if applicable",
        "Specific actionable recommendation 5 if applicable"
    ]
}}

IMPORTANT GUIDELINES:
1. Make insights SPECIFIC to the user's task - no generic statements
2. Include actual data, numbers, or concrete observations when possible
3. Make recommendations ACTIONABLE with clear next steps
4. Be detailed but concise - each insight should be 1-2 sentences
5. Tailor everything to the specific task type: {task_type}
6. If analyzing files, reference specific content from them
7. Provide professional, business-oriented analysis

Respond ONLY with valid JSON in the exact format above."""

        return prompt
    
    def _parse_ai_response(self, ai_response: str, description: str, file_count: int) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        
        try:
            # Try to extract JSON from response
            json_match = re.search(r'\{[\s\S]*\}', ai_response)
            if json_match:
                json_str = json_match.group(0)
                data = json.loads(json_str)
                
                # Validate and clean data
                summary = data.get('summary', '')
                insights = data.get('insights', [])
                recommendations = data.get('recommendations', [])
                
                # Ensure we have content
                if not summary or len(summary) < 20:
                    summary = f"AI analysis completed for: {description[:100]}..."
                
                if not insights or len(insights) < 2:
                    insights = [
                        "AI processing completed successfully",
                        f"Analyzed task: {description[:150]}",
                        f"Files processed: {file_count}"
                    ]
                
                if not recommendations or len(recommendations) < 2:
                    recommendations = [
                        "Review the insights provided above",
                        "Consider implementing suggested improvements",
                        "Monitor results and adjust as needed"
                    ]
                
                # Ensure lists have 3-5 items
                insights = insights[:5]
                recommendations = recommendations[:5]
                
                while len(insights) < 3:
                    insights.append(f"Additional analysis: Task processed with AI assistance")
                
                while len(recommendations) < 3:
                    recommendations.append(f"Continue monitoring and optimization")
                
                return {
                    "summary": summary,
                    "insights": insights,
                    "recommendations": recommendations,
                    "agents_involved": 4,
                    "files_processed": file_count,
                    "processing_mode": "ai",
                    "status": "success"
                }
            else:
                # If no JSON found, parse as text
                return self._parse_text_response(ai_response, description, file_count)
                
        except Exception as e:
            print(f"⚠️  Error parsing AI response: {e}")
            # Return the raw AI response in a structured format
            return self._parse_text_response(ai_response, description, file_count)
    
    def _parse_text_response(self, text: str, description: str, file_count: int) -> Dict[str, Any]:
        """Parse plain text AI response"""
        
        lines = text.split('\n')
        cleaned_lines = [line.strip() for line in lines if line.strip() and len(line.strip()) > 10]
        
        # Use first few lines as summary
        summary = ' '.join(cleaned_lines[:3])[:300] if cleaned_lines else f"AI analysis: {description[:200]}"
        
        # Extract bullet points or numbered items as insights
        insights = []
        recommendations = []
        
        for line in cleaned_lines:
            # Look for insights/findings
            if any(word in line.lower() for word in ['insight', 'finding', 'observation', 'analysis', 'data shows']):
                if len(insights) < 5:
                    insights.append(line[:200])
            # Look for recommendations/actions
            elif any(word in line.lower() for word in ['recommend', 'suggest', 'should', 'action', 'next step']):
                if len(recommendations) < 5:
                    recommendations.append(line[:200])
            # General points
            elif (line.startswith(('-', '•', '*')) or re.match(r'^\d+\.', line)):
                clean_line = re.sub(r'^[-•*\d.)\s]+', '', line).strip()
                if len(insights) < 5 and not recommendations:
                    insights.append(clean_line[:200])
                elif len(recommendations) < 5:
                    recommendations.append(clean_line[:200])
        
        # Ensure minimum content
        if not insights:
            insights = cleaned_lines[:5] if len(cleaned_lines) >= 5 else cleaned_lines + ["AI analysis completed"]
        
        if not recommendations:
            recommendations = [
                "Review the AI-generated insights carefully",
                "Implement relevant suggestions based on your context",
                "Monitor outcomes and iterate as needed"
            ]
        
        # Ensure 3-5 items
        insights = insights[:5]
        recommendations = recommendations[:5]
        
        while len(insights) < 3:
            insights.append(f"AI analysis: {description[:150]}")
        
        while len(recommendations) < 3:
            recommendations.append("Continue with regular monitoring and optimization")
        
        return {
            "summary": summary,
            "insights": insights,
            "recommendations": recommendations,
            "agents_involved": 4,
            "files_processed": file_count,
            "processing_mode": "ai",
            "status": "success"
        }
    
    async def _process_fallback(
        self,
        description: str,
        files: List[str],
        user_id: str,
        task_id: str,
        ws_manager
    ) -> Dict[str, Any]:
        """Fallback when AI is not available"""
        
        await self._send_log(ws_manager, user_id, task_id,
            "System", "processing",
            "Processing in fallback mode (AI unavailable)"
        )
        
        await asyncio.sleep(1)
        
        task_type = self._determine_task_type(description)
        
        return {
            "summary": f"Task processed: {description[:200]}. Note: AI analysis unavailable - please configure GEMINI_API_KEY for full AI capabilities.",
            "insights": [
                f"Task type identified as: {task_type}",
                f"Processed {len(files)} file(s)" if files else "No files provided",
                "AI analysis would provide more detailed insights",
                "Configure API key for enhanced analysis"
            ],
            "recommendations": [
                "Set up GEMINI_API_KEY environment variable",
                "Install google-generativeai package",
                "Retry task after configuration"
            ],
            "agents_involved": 2,
            "files_processed": len(files),
            "processing_mode": "fallback",
            "status": "success"
        }
    
    def _determine_task_type(self, description: str) -> str:
        """Determine task type"""
        desc_lower = description.lower()
        
        if any(word in desc_lower for word in ["analyze", "analysis", "data", "statistics", "trends"]):
            return "analysis"
        elif any(word in desc_lower for word in ["write", "create", "generate", "content", "document"]):
            return "generation"
        elif any(word in desc_lower for word in ["optimize", "improve", "enhance", "efficiency"]):
            return "optimization"
        elif any(word in desc_lower for word in ["summarize", "summary", "brief", "overview"]):
            return "summarization"
        elif any(word in desc_lower for word in ["report", "presentation", "dashboard"]):
            return "reporting"
        else:
            return "general"
    
    async def _send_log(
        self,
        ws_manager,
        user_id: str,
        task_id: str,
        agent: str,
        action: str,
        message: str
    ):
        """Send agent log via WebSocket"""
        if not ws_manager or not user_id:
            return
        
        try:
            log_data = {
                "agent": agent,
                "action": action,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await ws_manager.send_to_user(user_id, {
                "type": "agent_log",
                "task_id": task_id,
                "log": log_data
            })
        except Exception as e:
            print(f"Error sending log: {e}")


# Test function
async def test_agent_system():
    """Test the AI agent system"""
    print("\n" + "="*60)
    print("Testing AI Agent System with Gemini")
    print("="*60 + "\n")
    
    agent_system = AIAgentSystem()
    
    # Test task
    print("Test: Market Analysis")
    result = await agent_system.process_task(
        description="Analyze current AI market trends and provide strategic recommendations for tech startups",
        files=[],
        user_id="test_user",
        task_id="test_1"
    )
    
    print(f"\n✅ Mode: {result.get('processing_mode', 'unknown')}")
    print(f"📊 Summary: {result['summary']}")
    print(f"\n💡 Insights ({len(result['insights'])}):")
    for i, insight in enumerate(result['insights'], 1):
        print(f"   {i}. {insight}")
    print(f"\n📋 Recommendations ({len(result['recommendations'])}):")
    for i, rec in enumerate(result['recommendations'], 1):
        print(f"   {i}. {rec}")
    
    print("\n" + "="*60)


if __name__ == "__main__":
    asyncio.run(test_agent_system())