/**
 * Public UI exports.
 * Primitives live under `src/components` (shadcn / Base UI). Compose business UI in apps/web.
 */

export { Logo } from "./logo.js";
export type { LogoProps } from "./logo.js";

export { Alert, AlertDescription, AlertTitle, alertVariants } from "./components/alert.js";
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./components/alert-dialog.js";
export { Badge, badgeVariants } from "./components/badge.js";
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/breadcrumb.js";
export { Button, buttonVariants } from "./components/button.js";
export type { ButtonProps } from "./components/button.js";
export { ButtonIcon } from "./components/button-icon.js";
export { Checkbox } from "./components/checkbox.js";
export {
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/dialog.js";
export type { DialogContentProps } from "./components/dialog.js";
export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "./components/empty-state.js";
export { Field, FieldDescription, FieldError, FieldLabel } from "./components/field.js";
export { Input } from "./components/input.js";
export type { InputProps } from "./components/input.js";
export { Label } from "./components/label.js";
export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./components/popover.js";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select.js";
export type { SelectTriggerProps } from "./components/select.js";
export { Separator } from "./components/separator.js";
export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  sheetVariants,
} from "./components/sheet.js";
export { Skeleton } from "./components/skeleton.js";
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/table.js";
export type { TableProps } from "./components/table.js";
export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "./components/tabs.js";
export { Textarea } from "./components/textarea.js";
export type { TextareaProps } from "./components/textarea.js";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/tooltip.js";
export { cn } from "./lib/utils.js";
