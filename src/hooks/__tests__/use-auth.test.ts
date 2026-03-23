import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";

const anonWork = {
  messages: [{ id: "1", role: "user", content: "Make a button" }],
  fileSystemData: { "/App.tsx": { type: "file", content: "..." } },
};

const existingProject = { id: "proj-existing" };
const newProject = { id: "proj-new" };

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

describe("signIn", () => {
  test("returns loading=true while in flight, false after", async () => {
    let resolve!: (v: any) => void;
    (signInAction as any).mockReturnValue(new Promise((r) => (resolve = r)));
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);

    let signInPromise!: Promise<any>;
    act(() => {
      signInPromise = result.current.signIn("a@b.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolve({ success: true });
      await signInPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("redirects to new project created from anon work", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(anonWork);
    (createProject as any).mockResolvedValue({ id: "proj-anon" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-anon");
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("skips anon-work path when messages is empty", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
    (getProjects as any).mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });

  test("redirects to most recent existing project when no anon work", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([existingProject, { id: "proj-old" }]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
    expect(createProject).not.toHaveBeenCalled();
  });

  test("creates a new project when no existing projects", async () => {
    (signInAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue(newProject);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("a@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith(`/${newProject.id}`);
  });

  test("returns error result and does not redirect on failure", async () => {
    const errorResult = { success: false, error: "Invalid credentials" };
    (signInAction as any).mockResolvedValue(errorResult);

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signIn("a@b.com", "wrong");
    });

    expect(returned).toEqual(errorResult);
    expect(mockPush).not.toHaveBeenCalled();
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("resets isLoading to false even when action throws", async () => {
    (signInAction as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await expect(
      act(async () => {
        await result.current.signIn("a@b.com", "password");
      })
    ).rejects.toThrow("Network error");

    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// signUp
// ---------------------------------------------------------------------------

describe("signUp", () => {
  test("returns loading=true while in flight, false after", async () => {
    let resolve!: (v: any) => void;
    (signUpAction as any).mockReturnValue(new Promise((r) => (resolve = r)));
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);

    let signUpPromise!: Promise<any>;
    act(() => {
      signUpPromise = result.current.signUp("a@b.com", "password");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolve({ success: true });
      await signUpPromise;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("redirects to new project created from anon work", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(anonWork);
    (createProject as any).mockResolvedValue({ id: "proj-anon" });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: anonWork.messages,
      data: anonWork.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-anon");
  });

  test("redirects to most recent existing project when no anon work", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([existingProject]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@b.com", "password");
    });

    expect(mockPush).toHaveBeenCalledWith(`/${existingProject.id}`);
  });

  test("creates a new project when no existing projects", async () => {
    (signUpAction as any).mockResolvedValue({ success: true });
    (getAnonWorkData as any).mockReturnValue(null);
    (getProjects as any).mockResolvedValue([]);
    (createProject as any).mockResolvedValue(newProject);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@b.com", "password");
    });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringMatching(/^New Design #\d+$/),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith(`/${newProject.id}`);
  });

  test("returns error result and does not redirect on failure", async () => {
    const errorResult = { success: false, error: "Email already registered" };
    (signUpAction as any).mockResolvedValue(errorResult);

    const { result } = renderHook(() => useAuth());
    let returned: any;
    await act(async () => {
      returned = await result.current.signUp("existing@b.com", "password");
    });

    expect(returned).toEqual(errorResult);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading to false even when action throws", async () => {
    (signUpAction as any).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());
    await expect(
      act(async () => {
        await result.current.signUp("a@b.com", "password");
      })
    ).rejects.toThrow("Network error");

    expect(result.current.isLoading).toBe(false);
  });
});
