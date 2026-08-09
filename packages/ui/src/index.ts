/**
 * Public UI exports.
 * Primitives live under `src/components` (shadcn / Base UI). Compose business UI in apps/web.
 */

export { Logo } from "./logo";
export type { LogoProps } from "./logo";

export { ActionBar, ActionBarEnd, ActionBarStart } from "./components/action-bar";
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
export { Avatar, AvatarFallback, AvatarImage } from "./components/avatar";
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  cardVariants,
} from "./components/card";
export {
  ChoiceGroup,
  ChoiceGroupIndicator,
  ChoiceGroupItem,
  choiceGroupItemVariants,
} from "./components/choice-group";
export type { ChoiceGroupItemProps } from "./components/choice-group";
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
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./components/collapsible";
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./components/dropdown-menu";
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
  emptyStateVariants,
} from "./components/empty-state";
export { Field, FieldDescription, FieldError, FieldLabel, FieldValidity } from "./components/field";
export type { FieldActions } from "./components/field";
export { Form } from "./components/form";
export type { FormErrors, FormProps } from "./components/form";
export { readFormString } from "./lib/read-form-string";
export { Input } from "./components/input";
export type { InputProps } from "./components/input";
export { InputWithIcon } from "./components/input-with-icon";
export type { InputWithIconProps } from "./components/input-with-icon";
export { Label } from "./components/label";
export { MasterDetail } from "./components/master-detail";
export type { MasterDetailProps } from "./components/master-detail";
export {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "./components/popover";
export {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "./components/progress";
export { ScrollArea, ScrollAreaContent, ScrollBar } from "./components/scroll-area";
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
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuLink,
  SidebarProvider,
  SidebarRail,
  sidebarMenuButtonVariants,
  useSidebar,
} from "./components/sidebar";
export { Skeleton } from "./components/skeleton";
export {
  Stat,
  StatGroup,
  StatHint,
  StatLabel,
  StatValue,
  statValueVariants,
  statVariants,
} from "./components/stat";
export type { StatProps, StatValueProps } from "./components/stat";
export { Stepper } from "./components/stepper";
export type { StepperStep } from "./components/stepper";
export { Switch } from "./components/switch";
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
export { useCopyToClipboard } from "./hooks/use-copy-to-clipboard";
export type { Icon, IconProps, IconWeight } from "./lib/icon";
export { FUTROB_ICON_CATALOG } from "./icons/catalog";
export type { FutrobIconEntry } from "./icons/catalog";
export { cn } from "./lib/utils";
