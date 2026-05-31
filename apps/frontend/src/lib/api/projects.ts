/**
 * Backend API-based project storage service
 * Uses the backend database instead of filesystem
 */

export interface ProjectData {
  project_id: string;
  owner_id: string;
  name: string;
  nodes: any[];
  edges: any[];
  created_at: string;
  updated_at: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getSessionUserId(): Promise<string> {
  try {
    // Get session from NextAuth
    const response = await fetch("/api/auth/session");
    const session = await response.json();
    
    if (!session?.user?.id) {
      throw new Error("Not authenticated");
    }
    
    return session.user.id;
  } catch (error) {
    console.error("[ProjectAPI] Failed to get session:", error);
    throw new Error("Authentication required");
  }
}

export async function saveProjectToBackend(
  projectName: string,
  nodes: any[],
  edges: any[],
  projectId?: string
): Promise<ProjectData> {
  try {
    const ownerId = await getSessionUserId();
    
    console.log("[ProjectAPI.save]", {
      projectId: projectId || "new",
      name: projectName,
      ownerId,
      nodesCount: nodes.length,
      edgesCount: edges.length,
    });
    
    const response = await fetch(`${API_BASE}/api/projects/save`, {
      method: "POST",
      headers: {
        "owner-id": ownerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId || null,
        name: projectName,
        nodes: nodes,
        edges: edges,
      }),
    });
    
    console.log("[ProjectAPI.save] Response status:", response.status);
    
    let result: any = {};
    try {
      result = await response.json();
    } catch (parseError) {
      console.warn("[ProjectAPI.save] Failed to parse JSON response");
    }
    
    if (!response.ok) {
      const errorMessage = result?.detail || result?.message || `Save failed (${response.status})`;
      console.error("[ProjectAPI.save] Error:", { status: response.status, detail: errorMessage });
      throw new Error(errorMessage);
    }
    
    console.log("[ProjectAPI.save] SUCCESS", { 
      projectId: result.data?.project_id,
      name: result.data?.name,
    });
    
    return result.data;
  } catch (error) {
    console.error("[ProjectAPI.save] Exception:", error);
    throw error;
  }
}

export async function listProjectsFromBackend(): Promise<ProjectData[]> {
  try {
    const ownerId = await getSessionUserId();
    
    console.log("[ProjectAPI.list] Fetching projects...", { ownerId });
    
    const response = await fetch(`${API_BASE}/api/projects/list`, {
      method: "GET",
      headers: {
        "owner-id": ownerId,
      },
    });
    
    console.log("[ProjectAPI.list] Response status:", response.status, response.statusText);
    
    // Try to parse JSON
    let result: any = {};
    try {
      result = await response.json();
      console.log("[ProjectAPI.list] Response body:", result);
    } catch (parseError) {
      console.warn("[ProjectAPI.list] Failed to parse JSON:", parseError);
    }
    
    if (!response.ok) {
      const errorMessage = result?.detail || result?.message || `List failed (${response.status})`;
      console.error("[ProjectAPI.list] Error:", { status: response.status, detail: errorMessage, result });
      throw new Error(errorMessage);
    }
    
    console.log("[ProjectAPI.list] SUCCESS", { 
      count: result.data?.length || 0,
    });
    
    return result.data || [];
  } catch (error) {
    console.error("[ProjectAPI.list] Exception:", error);
    return []; // Return empty list on error
  }
};

export async function getProjectFromBackend(projectId: string): Promise<ProjectData> {
  try {
    const ownerId = await getSessionUserId();
    
    console.log("[ProjectAPI.get]", { projectId, ownerId });
    
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: "GET",
      headers: {
        "owner-id": ownerId,
      },
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error("[ProjectAPI.get] Error:", result);
      throw new Error(result.detail || `Get failed (${response.status})`);
    }
    
    console.log("[ProjectAPI.get] SUCCESS", { projectId });
    
    return result.data;
  } catch (error) {
    console.error("[ProjectAPI.get] Exception:", error);
    throw error;
  }
}

export async function deleteProjectFromBackend(projectId: string): Promise<void> {
  try {
    const ownerId = await getSessionUserId();
    
    console.log("[ProjectAPI.delete]", { projectId, ownerId });
    
    const response = await fetch(`${API_BASE}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: {
        "owner-id": ownerId,
      },
    });

    console.log("[ProjectAPI.delete] Response status:", response.status);
    
    let result: any = {};
    try {
      result = await response.json();
      console.log("[ProjectAPI.delete] Response body:", result);
    } catch (parseError) {
      console.warn("[ProjectAPI.delete] Failed to parse JSON response");
    }
    
    if (!response.ok) {
      const errorMessage = result?.detail || result?.message || `Delete failed (${response.status})`;
      console.error("[ProjectAPI.delete] Error:", { status: response.status, detail: errorMessage });
      throw new Error(errorMessage);
    }
    
    console.log("[ProjectAPI.delete] SUCCESS", { projectId });
  } catch (error) {
    console.error("[ProjectAPI.delete] Exception:", error);
    throw error;
  }
}
