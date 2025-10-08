import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/utils/tailwind";
import { Button, buttonVariants } from "@/components/ui/button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:2rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-6 w-6 select-none p-0 aria-disabled:opacity-50 hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-6 w-6 select-none p-0 aria-disabled:opacity-50 hover:bg-accent hover:text-accent-foreground transition-colors rounded-sm",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-10 w-full items-center justify-center px-2 text-sm font-medium",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-8 sm:h-10 w-full items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "has-focus:border-ring border-input shadow-sm has-focus:ring-ring/50 has-focus:ring-2 relative rounded-md border bg-background hover:bg-accent/50 transition-colors",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0 cursor-pointer",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-xs sm:text-sm"
            : "[&>svg]:text-muted-foreground flex h-6 sm:h-8 items-center gap-0.5 sm:gap-1 rounded-md pl-2 sm:pl-3 pr-1 sm:pr-2 text-xs sm:text-sm font-semibold bg-accent/30 hover:bg-accent/50 transition-colors [&>svg]:size-2.5 sm:[&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        table: "w-full max-w-full border-collapse table-fixed overflow-hidden",
        weekdays: cn("grid grid-cols-7 w-full", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground select-none rounded-sm text-xs font-medium py-1 text-center overflow-hidden text-ellipsis",
          defaultClassNames.weekday,
        ),
        week: cn("grid grid-cols-7 w-full h-full", defaultClassNames.week),
        week_number_header: cn(
          "w-6 select-none flex-shrink-0",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-muted-foreground select-none text-xs",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative select-none p-0 text-center overflow-hidden flex items-center justify-center h-7 w-7 [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
          defaultClassNames.day,
        ),
        range_start: cn(
          "bg-accent rounded-l-md",
          defaultClassNames.range_start,
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("bg-accent rounded-r-md", defaultClassNames.range_end),
        today: cn(
          "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md font-semibold ring-1 ring-blue-300 dark:ring-blue-500/50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:ring-accent/50",
          defaultClassNames.today,
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-accent data-[selected-single=true]:text-accent-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-accent data-[range-start=true]:text-accent-foreground data-[range-end=true]:bg-accent data-[range-end=true]:text-accent-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 flex h-7 w-7 min-w-7 max-w-7 flex-col gap-0.5 leading-none font-normal text-xs group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md hover:bg-accent hover:text-accent-foreground transition-colors duration-150 [&>span]:text-[10px] [&>span]:opacity-70 overflow-hidden text-ellipsis justify-center items-center",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
