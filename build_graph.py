import os
import json
import re
from typing import Dict, List

def build_smart_architecture_graph(source_dir: str, output_file: str):
    print(f"Scanning {source_dir} for Behavioral Metadata...")
    if not os.path.exists(source_dir):
        print(f"Error: Directory {source_dir} not found.")
        return

    import_pattern = re.compile(r"(?:import|export)\s+.*?(?:from\s+)?['\"]([^'\"]+)['\"]")
    
    core_nodes: Dict[str, Dict] = {}
    core_edges: List[Dict] = []
    file_paths: List[str] = []

    for root, _, files in os.walk(source_dir):
        for file in files:
            if not file.endswith(('.ts', '.tsx')) or file.endswith(('.test.ts', '.spec.ts', '.d.ts')):
                continue
                
            file_path = os.path.join(root, file)
            file_paths.append(file_path)
            relative_path = os.path.relpath(file_path, source_dir)
            file_node_id = relative_path.replace('\\', '/')
            
            is_tracked = False
            group = "utility"
            display_name = file.replace('.ts', '').replace('.tsx', '')
            description = ""
            extends_class = None
            public_exports = []
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # 1. Extract Class Name & Inheritance
                    class_match = re.search(r'class\s+([A-Z][a-zA-Z0-9]+)(?:\s+extends\s+([A-Z][a-zA-Z0-9]+))?', content)
                    if class_match:
                        display_name = class_match.group(1)
                        if class_match.group(2):
                            extends_class = class_match.group(2)
                        
                    # 2. Extract Top 3 Public Exports (Functions, Consts, Interfaces)
                    export_matches = re.findall(r'export\s+(?:async\s+)?(?:function|const|class|interface|type)\s+([a-zA-Z0-9_]+)', content)
                    # Filter out the main class name to avoid redundancy, and limit to 3
                    public_exports = [e for e in export_matches if e != display_name][:3]
                        
                    # 3. Extract Explicit Description
                    desc_match = re.search(r'description:\s*["\']([^"\']+)["\']', content)
                    if desc_match:
                        description = desc_match.group(1)
                    
                    # Domain Categorization
                    if "extends Tool" in content or "class BaseTool" in content:
                        is_tracked, group = True, "tool"
                    elif "MCP" in content and ("client" in relative_path.lower() or "server" in relative_path.lower()):
                        is_tracked, group = True, "mcp"
                    elif "/commands/" in relative_path.lower() or "AgentLoop" in content or "class Agent" in content:
                        is_tracked, group = True, "agent"
                    elif "/services/" in relative_path.lower() or "Anthropic" in content or file.lower() == "api.ts":
                        is_tracked, group = True, "api"
                    elif "/context/" in relative_path.lower() or "session" in file.lower() or "memory" in file.lower() or "config" in file.lower():
                        is_tracked, group = True, "state"
                    elif "/components/" in relative_path.lower() and any(x in file for x in ["Dialog", "Menu", "Panel", "View"]):
                        is_tracked, group = True, "ui"
                    elif "/query/" in relative_path.lower() or "/tasks/" in relative_path.lower() or "/coordinator/" in relative_path.lower() or "QueryEngine" in file or "Task.ts" in file:
                        is_tracked, group = True, "engine"
                    elif "/bootstrap/" in relative_path.lower() or "/cli/" in relative_path.lower() or "/entrypoints/" in relative_path.lower() or file == "main.tsx":
                        is_tracked, group = True, "boot"
                    elif "/ink/" in relative_path.lower() or "/screens/" in relative_path.lower():
                        is_tracked, group = True, "render"
                    elif "/voice/" in relative_path.lower():
                        is_tracked, group = True, "voice"
                        
                    # 4. Intelligent Fallback Descriptions (If no explicit description found)
                    if not description:
                        fallbacks = {
                            "tool": "Executes specific agent capabilities and OS interactions.",
                            "agent": "CLI command handler and orchestration logic.",
                            "mcp": "Model Context Protocol interface and server routing.",
                            "api": "Network requests and external LLM communication.",
                            "state": "Manages conversational memory and persistent session data.",
                            "ui": "Terminal-based interactive user interface component.",
                            "engine": "Core LLM reasoning, task queuing, and event loops.",
                            "boot": "Application initialization and environment setup.",
                            "render": "React Ink layout and terminal painting logic.",
                            "voice": "Speech-to-text integration and audio processing."
                        }
                        description = fallbacks.get(group, "System infrastructure component.")
                        
            except Exception: pass

            if is_tracked:
                core_nodes[file_node_id] = {
                    "id": file_node_id,
                    "type": "customNode",
                    "data": { 
                        "label": display_name,
                        "path": file_node_id,
                        "group": group,
                        "description": description,
                        "extends": extends_class,
                        "exports": public_exports
                    }
                }

    connected_node_ids = set()
    seen_edges = set() 
    
    for file_path in file_paths:
        relative_path = os.path.relpath(file_path, source_dir)
        source_id = relative_path.replace('\\', '/')
        if source_id not in core_nodes: continue
            
        file_dir = os.path.dirname(file_path)
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                imports = import_pattern.findall(f.read())
                for imp in imports:
                    if not imp.startswith('.'): continue
                        
                    target_abs = os.path.normpath(os.path.join(file_dir, imp))
                    target_base = os.path.relpath(target_abs, source_dir).replace('\\', '/')
                    if target_base.endswith('.js'): target_base = target_base[:-3]
                        
                    for suffix in ['', '.ts', '.tsx', '/index.ts']:
                        test_id = target_base + suffix
                        if test_id in core_nodes:
                            edge_id = f"{source_id}->{test_id}"
                            
                            
                            if edge_id not in seen_edges:
                                seen_edges.add(edge_id)
                                core_edges.append({
                                    "id": edge_id,
                                    "source": source_id,
                                    "target": test_id,
                                    "animated": True,
                                    "style": { "stroke": "#94A3B8", "strokeWidth": 2 }
                                })
                                connected_node_ids.add(source_id)
                                connected_node_ids.add(test_id)
                            break
        except Exception: pass

    final_nodes = [node for node_id, node in core_nodes.items() if node_id in connected_node_ids]

    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({"nodes": final_nodes, "edges": core_edges}, f, indent=2)
        
    print(f"Success! Smart graph built: {len(final_nodes)} nodes with Behavioral Metadata.")

if __name__ == "__main__":
    SOURCE_DIRECTORY = "./claude-code-info/claude"
    OUTPUT_JSON = "./frontend/public/graph.json"
    build_smart_architecture_graph(SOURCE_DIRECTORY, OUTPUT_JSON)