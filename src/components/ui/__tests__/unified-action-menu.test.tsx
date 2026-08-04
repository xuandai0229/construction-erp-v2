import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { UnifiedActionMenu } from "../unified-action-menu";

describe("UnifiedActionMenu Architecture & Safety Tests", () => {
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("1. Uncontrolled Mode: Toggles open and closed without console errors", () => {
    render(
      <UnifiedActionMenu
        ariaLabel="Test Menu"
        trigger={<button>Open Menu</button>}
        items={[
          { id: "item1", label: "Option 1" },
          { id: "item2", label: "Option 2" },
        ]}
      />
    );

    const triggerBtn = screen.getByText("Open Menu");
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(triggerBtn);
    expect(screen.getByRole("menu")).not.toBeNull();
    expect(screen.getByText("Option 1")).not.toBeNull();

    // Click trigger again to close
    fireEvent.click(triggerBtn);
    expect(screen.queryByRole("menu")).toBeNull();

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Cannot update a component")
    );
  });

  it("2. Controlled Mode: Parent state updates cleanly when onOpenChange is called", () => {
    function ParentComponent() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <span data-testid="status">{isOpen ? "OPEN" : "CLOSED"}</span>
          <UnifiedActionMenu
            open={isOpen}
            onOpenChange={setIsOpen}
            trigger={<button>Controlled Trigger</button>}
            items={[{ id: "1", label: "Controlled Item" }]}
          />
        </div>
      );
    }

    render(<ParentComponent />);
    expect(screen.getByTestId("status").textContent).toBe("CLOSED");

    fireEvent.click(screen.getByText("Controlled Trigger"));
    expect(screen.getByTestId("status").textContent).toBe("OPEN");
    expect(screen.getByText("Controlled Item")).not.toBeNull();

    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Cannot update a component")
    );
  });

  it("3. Escape key closes the menu safely", () => {
    render(
      <UnifiedActionMenu
        trigger={<button>Escape Trigger</button>}
        items={[{ id: "1", label: "Esc Item" }]}
      />
    );

    fireEvent.click(screen.getByText("Escape Trigger"));
    expect(screen.getByRole("menu")).not.toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("4. Selecting an item closes the menu", () => {
    const onItemClick = vi.fn();

    render(
      <UnifiedActionMenu
        trigger={<button>Click Item Trigger</button>}
        items={[{ id: "1", label: "Clickable Item", onClick: onItemClick }]}
      />
    );

    fireEvent.click(screen.getByText("Click Item Trigger"));
    const itemBtn = screen.getByText("Clickable Item");

    fireEvent.click(itemBtn);
    expect(onItemClick).toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("5. Does NOT invoke onOpenChange on initial render or re-render", () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <UnifiedActionMenu
        onOpenChange={onOpenChange}
        trigger={<button>Static Trigger</button>}
        items={[{ id: "1", label: "Static Item" }]}
      />
    );

    expect(onOpenChange).not.toHaveBeenCalled();

    rerender(
      <UnifiedActionMenu
        onOpenChange={onOpenChange}
        trigger={<button>Static Trigger Updated</button>}
        items={[{ id: "1", label: "Static Item" }]}
      />
    );

    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
