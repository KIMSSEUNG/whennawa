'use client'

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { DayButton, DayPicker, getDefaultClassNames, useDayPicker } from 'react-day-picker'
import { format, getMonth, getYear, setMonth, setYear } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type CalendarSelectedValue =
  | Date
  | Date[]
  | { from?: Date; to?: Date }
  | undefined

type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
  selected?: CalendarSelectedValue
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  month: controlledMonth,
  onMonthChange,
  selected,
  defaultMonth,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()
  const selectedMonth = React.useMemo(
    () => resolveCalendarMonth(selected) ?? defaultMonth ?? new Date(),
    [defaultMonth, selected],
  )
  const [internalMonth, setInternalMonth] = React.useState<Date>(selectedMonth)

  React.useEffect(() => {
    if (!controlledMonth) {
      setInternalMonth(selectedMonth)
    }
  }, [controlledMonth, selectedMonth])

  const month = controlledMonth ?? internalMonth

  const handleMonthChange = React.useCallback(
    (nextMonth: Date) => {
      if (!controlledMonth) {
        setInternalMonth(nextMonth)
      }
      onMonthChange?.(nextMonth)
    },
    [controlledMonth, onMonthChange],
  )

  const dayPickerProps = {
    ...props,
    ...(selected !== undefined ? { selected } : {}),
  } as React.ComponentProps<typeof DayPicker>

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      month={month}
      onMonthChange={handleMonthChange}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'flex gap-4 flex-col md:flex-row relative',
          defaultClassNames.months,
        ),
        month: cn('flex flex-col w-full gap-4', defaultClassNames.month),
        nav: cn(
          'flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          'size-(--cell-size) aria-disabled:opacity-50 p-0 select-none',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex items-center justify-center h-(--cell-size) w-full px-10',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute bg-popover inset-0 opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-md bg-accent',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-muted-foreground aria-selected:text-muted-foreground',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'text-muted-foreground opacity-50',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
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
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            )
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          )
        },
        MonthCaption: CalendarMonthCaption,
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      defaultMonth={defaultMonth}
      {...dayPickerProps}
    />
  )
}

function CalendarMonthCaption({
  calendarMonth,
  className,
  ...props
}: React.ComponentProps<'div'> & { calendarMonth: { date: Date } }) {
  const { goToMonth, previousMonth, nextMonth, dayPickerProps } = useDayPicker()
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const monthDate = calendarMonth.date

  const minYear = React.useMemo(() => {
    const start = dayPickerProps.startMonth
    return start
      ? getYear(start)
      : Math.min(getYear(monthDate), new Date().getFullYear()) - 15
  }, [dayPickerProps.startMonth, monthDate])

  const maxYear = React.useMemo(() => {
    const end = dayPickerProps.endMonth
    return end
      ? getYear(end)
      : Math.max(getYear(monthDate), new Date().getFullYear()) + 10
  }, [dayPickerProps.endMonth, monthDate])

  const years = React.useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, index) => minYear + index),
    [maxYear, minYear],
  )

  const changeMonth = (monthIndex: number) => {
    goToMonth(setMonth(monthDate, monthIndex))
  }

  const changeYear = (yearValue: number) => {
    goToMonth(setYear(monthDate, yearValue))
  }

  return (
    <div
      className={cn('relative flex w-full items-center justify-center', className)}
      {...props}
    >
      <button
        type="button"
        className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground hover:bg-accent"
        onClick={() => setPickerOpen((prev) => !prev)}
        aria-label={`${format(monthDate, 'MMMM yyyy')} month and year picker`}
      >
        <span>{format(monthDate, 'MMMM yyyy')}</span>
        <ChevronDownIcon
          className={cn('h-4 w-4 transition-transform', pickerOpen && 'rotate-180')}
        />
      </button>

      {pickerOpen ? (
        <div className="absolute top-10 z-20 flex items-center gap-2 rounded-xl border border-border bg-background p-2 shadow-lg">
          <Select
            value={String(getMonth(monthDate))}
            onValueChange={(value) => changeMonth(Number(value))}
          >
            <SelectTrigger className="h-9 w-[8.5rem] bg-background text-sm">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent align="center" className="w-[8.5rem]">
              {Array.from({ length: 12 }, (_, monthIndex) => (
                <SelectItem key={monthIndex} value={String(monthIndex)}>
                  {format(new Date(2026, monthIndex, 1), 'MMMM')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(getYear(monthDate))}
            onValueChange={(value) => changeYear(Number(value))}
          >
            <SelectTrigger className="h-9 w-[6.5rem] bg-background text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent align="center" className="w-[6.5rem]">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-xs"
            onClick={() => setPickerOpen(false)}
          >
            Done
          </Button>
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute left-0 h-8 w-8"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 h-8 w-8"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        aria-label="Next month"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

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
        'data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  )
}

function resolveCalendarMonth(
  selected: CalendarSelectedValue,
): Date | undefined {
  if (!selected) {
    return undefined
  }
  if (selected instanceof Date) {
    return selected
  }
  if (typeof selected === 'object') {
    if ('from' in selected && selected.from instanceof Date) {
      return selected.from
    }
    if ('to' in selected && selected.to instanceof Date) {
      return selected.to
    }
  }
  if (Array.isArray(selected)) {
    const firstDate = selected.find((item): item is Date => item instanceof Date)
    return firstDate
  }
  return undefined
}

export { Calendar, CalendarDayButton }
