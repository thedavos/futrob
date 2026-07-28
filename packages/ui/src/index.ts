/**
 * Public UI exports.
 * Primitives live under `src/components` (shadcn / Base UI). Compose business UI in apps/web.
 */

export { Logo } from "./logo";
export type { LogoProps } from "./logo";

export { Alert, AlertDescription, AlertTitle, alertVariants } from "./components/alert";
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
} from "./components/alert-dialog";
export { Badge, badgeVariants } from "./components/badge";
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/breadcrumb";
export { Button, buttonVariants } from "./components/button";
export type { ButtonProps } from "./components/button";
export { ButtonIcon } from "./components/button-icon";
export { Checkbox } from "./components/checkbox";
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
} from "./components/dialog";
export type { DialogContentProps } from "./components/dialog";
export {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "./components/empty-state";
export { Field, FieldDescription, FieldError, FieldLabel } from "./components/field";
export { Input } from "./components/input";
export type { InputProps } from "./components/input";
export { InputWithIcon } from "./components/input-with-icon";
export type { InputWithIconProps } from "./components/input-with-icon";
export { Label } from "./components/label";
export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./components/popover";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select";
export type { SelectTriggerProps } from "./components/select";
export { Separator } from "./components/separator";
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
} from "./components/sheet";
export { Skeleton } from "./components/skeleton";
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
} from "./components/table";
export type { TableProps } from "./components/table";
export { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "./components/tabs";
export { Textarea } from "./components/textarea";
export type { TextareaProps } from "./components/textarea";
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./components/tooltip";
export { cn } from "./lib/utils";
