import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={resolvedTheme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
          className="text-muted-foreground hover:text-foreground"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {resolvedTheme === "dark" ? "Tema claro" : "Tema oscuro"}
      </TooltipContent>
    </Tooltip>
  );
}
