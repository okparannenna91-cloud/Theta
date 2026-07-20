import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "status"
  | "people"
  | "checkbox"
  | "link"
  | "email"
  | "phone"
  | "dropdown"
  | "rating"
  | "vote"
  | "files"
  | "location"
  | "autoNumber"
  | "formula"
  | "progress"
  | "timeTracking"
  | "colorPicker";

export interface CreateFieldInput {
  name: string;
  boardId: string;
  type: FieldType;
  settings?: Record<string, unknown>;
  order?: number;
  width?: number;
  color?: string;
}

export interface UpdateFieldInput {
  name?: string;
  settings?: Record<string, unknown>;
  order?: number;
  width?: number;
  color?: string;
  visible?: boolean;
  pinned?: boolean;
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: FieldType;
  boardId: string;
  settings: Record<string, unknown> | null;
  order: number;
  width: number;
  visible: boolean;
  pinned: boolean;
}

export interface FieldValue {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Default settings per field type
// ---------------------------------------------------------------------------

const DEFAULT_SETTINGS: Record<FieldType, Record<string, unknown>> = {
  text: { placeholder: "", multiline: false, maxLength: 0 },
  number: { decimal: false, min: 0, max: 0, prefix: "", suffix: "" },
  date: { includeTime: false, format: "MM/dd/yyyy" },
  status: { options: [] as string[], colors: [] as string[] },
  people: { multiple: false },
  checkbox: { defaultValue: false },
  link: { placeholder: "" },
  email: { placeholder: "" },
  phone: { format: "international" },
  dropdown: { options: [] as string[], multiple: false, allowCreate: false },
  rating: { max: 5, style: "star" },
  vote: { allowDownvote: false },
  files: { maxFiles: 10, acceptedTypes: "" },
  location: { defaultCenter: { lat: 0, lng: 0 }, zoom: 12 },
  autoNumber: { prefix: "", startAt: 1 },
  formula: { expression: "" },
  progress: { min: 0, max: 100, unit: "%" },
  timeTracking: { estimate: false },
  colorPicker: { defaultColor: "#000000", presetColors: [] as string[] },
};

const VALID_FIELD_TYPES = new Set<string>(Object.keys(DEFAULT_SETTINGS));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFieldDefinition(row: {
  id: string;
  name: string;
  columnType: string;
  boardId: string;
  settings: unknown;
  order: number;
  width: number | null;
  visible: boolean;
  pinned: boolean;
}): FieldDefinition {
  return {
    id: row.id,
    name: row.name,
    type: row.columnType as FieldType,
    boardId: row.boardId,
    settings: (row.settings as Record<string, unknown>) ?? null,
    order: row.order,
    width: row.width ?? 200,
    visible: row.visible,
    pinned: row.pinned,
  };
}

function parseFieldValues(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

function parseMetadata(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  try {
    return JSON.parse(String(raw));
  } catch {
    return {};
  }
}

function nextOrder(order: number | undefined, maxOrder: number): number {
  return order ?? maxOrder + 1;
}

// ---------------------------------------------------------------------------
// 1. createField
// ---------------------------------------------------------------------------

export async function createField(
  input: CreateFieldInput,
): Promise<FieldDefinition> {
  try {
    const existing = await prisma.column.findMany({
      where: { boardId: input.boardId },
      select: { order: true },
    });
    const maxOrder = existing.reduce((m, c) => Math.max(m, c.order), -1);

    const column = await prisma.column.create({
      data: {
        name: input.name,
        boardId: input.boardId,
        columnType: input.type,
        settings: (input.settings ?? DEFAULT_SETTINGS[input.type] ?? null) as object,
        order: nextOrder(input.order, maxOrder),
        width: input.width ?? 200,
        color: input.color ?? null,
        visible: true,
        pinned: false,
      },
    });

    logger.info(`Created custom field "${input.name}" (${input.type}) on board ${input.boardId}`);
    return toFieldDefinition(column);
  } catch (err) {
    logger.error("Failed to create custom field", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. updateField
// ---------------------------------------------------------------------------

export async function updateField(
  fieldId: string,
  updates: UpdateFieldInput,
): Promise<FieldDefinition> {
  try {
    const column = await prisma.column.update({
      where: { id: fieldId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.settings !== undefined && { settings: updates.settings as object }),
        ...(updates.order !== undefined && { order: updates.order }),
        ...(updates.width !== undefined && { width: updates.width }),
        ...(updates.color !== undefined && { color: updates.color }),
        ...(updates.visible !== undefined && { visible: updates.visible }),
        ...(updates.pinned !== undefined && { pinned: updates.pinned }),
      },
    });

    logger.info(`Updated custom field ${fieldId}`);
    return toFieldDefinition(column);
  } catch (err) {
    logger.error("Failed to update custom field", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 3. deleteField
// ---------------------------------------------------------------------------

export async function deleteField(fieldId: string): Promise<void> {
  try {
    const tasksOnBoard = await prisma.task.findMany({
      where: {
        boardId: { not: null },
        fieldValues: { not: null },
      },
      select: { id: true, fieldValues: true, boardId: true },
    });

    const field = await prisma.column.findUnique({ where: { id: fieldId } });
    if (!field) {
      throw new Error(`Field ${fieldId} not found`);
    }

    const affected = tasksOnBoard.filter((t) => t.boardId === field.boardId);

    const cleanupOps = affected.map((task) => {
      const values = parseFieldValues(task.fieldValues);
      if (fieldId in values) {
        delete values[fieldId];
        return prisma.task.update({
          where: { id: task.id },
          data: { fieldValues: values as object },
        });
      }
      return null;
    });

    await Promise.all(cleanupOps);

    await prisma.column.delete({ where: { id: fieldId } });

    logger.info(`Deleted custom field ${fieldId} and cleaned up ${affected.length} tasks`);
  } catch (err) {
    logger.error("Failed to delete custom field", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 4. getFieldsForBoard
// ---------------------------------------------------------------------------

export async function getFieldsForBoard(boardId: string): Promise<FieldDefinition[]> {
  try {
    const columns = await prisma.column.findMany({
      where: { boardId },
      orderBy: { order: "asc" },
    });

    return columns.map(toFieldDefinition);
  } catch (err) {
    logger.error("Failed to get fields for board", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 5. getField
// ---------------------------------------------------------------------------

export async function getField(fieldId: string): Promise<FieldDefinition | null> {
  try {
    const column = await prisma.column.findUnique({ where: { id: fieldId } });
    if (!column) return null;
    return toFieldDefinition(column);
  } catch (err) {
    logger.error("Failed to get custom field", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 6. setFieldValue
// ---------------------------------------------------------------------------

export async function setFieldValue(
  taskId: string,
  fieldId: string,
  value: unknown,
): Promise<void> {
  try {
    const field = await prisma.column.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error(`Field ${fieldId} not found`);

    const validation = validateFieldValue(field.columnType as FieldType, value, field.settings as Record<string, unknown> | undefined);
    if (!validation.valid) {
      throw new Error(`Invalid value for field "${field.name}": ${validation.error}`);
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const values = parseFieldValues(task.fieldValues);
    values[fieldId] = value;

    const metadata = parseMetadata(task.customFieldMetadata);
    metadata[fieldId] = {
      fieldType: field.columnType,
      fieldName: field.name,
      updatedAt: new Date().toISOString(),
    };

    await prisma.task.update({
      where: { id: taskId },
      data: {
        fieldValues: values as object,
        customFieldMetadata: metadata as object,
      },
    });
  } catch (err) {
    logger.error("Failed to set field value", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 7. setMultipleFieldValues
// ---------------------------------------------------------------------------

export async function setMultipleFieldValues(
  taskId: string,
  values: Record<string, unknown>,
): Promise<void> {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const fieldIds = Object.keys(values);
    if (fieldIds.length === 0) return;

    const fields = await prisma.column.findMany({
      where: { id: { in: fieldIds } },
    });

    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    const currentValues = parseFieldValues(task.fieldValues);
    const currentMetadata = parseMetadata(task.customFieldMetadata);
    let hasError = false;
    let errorMsg = "";

    for (const [fieldId, value] of Object.entries(values)) {
      const field = fieldMap.get(fieldId);
      if (!field) {
        hasError = true;
        errorMsg = `Field ${fieldId} not found`;
        break;
      }

      const validation = validateFieldValue(field.columnType as FieldType, value, field.settings as Record<string, unknown> | undefined);
      if (!validation.valid) {
        hasError = true;
        errorMsg = `Invalid value for field "${field.name}": ${validation.error}`;
        break;
      }

      currentValues[fieldId] = value;
      currentMetadata[fieldId] = {
        fieldType: field.columnType,
        fieldName: field.name,
        updatedAt: new Date().toISOString(),
      };
    }

    if (hasError) throw new Error(errorMsg);

    await prisma.task.update({
      where: { id: taskId },
      data: {
        fieldValues: currentValues as object,
        customFieldMetadata: currentMetadata as object,
      },
    });
  } catch (err) {
    logger.error("Failed to set multiple field values", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 8. getFieldValue
// ---------------------------------------------------------------------------

export async function getFieldValue(
  taskId: string,
  fieldId: string,
): Promise<unknown> {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const values = parseFieldValues(task.fieldValues);
    return values[fieldId] ?? null;
  } catch (err) {
    logger.error("Failed to get field value", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 9. getAllFieldValues
// ---------------------------------------------------------------------------

export async function getAllFieldValues(taskId: string): Promise<FieldValue[]> {
  try {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new Error(`Task ${taskId} not found`);

    const values = parseFieldValues(task.fieldValues);
    const fieldIds = Object.keys(values);
    if (fieldIds.length === 0) return [];

    const fields = await prisma.column.findMany({
      where: { id: { in: fieldIds } },
    });

    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    return fieldIds
      .filter((id) => fieldMap.has(id))
      .map((id) => {
        const f = fieldMap.get(id)!;
        return {
          fieldId: id,
          fieldName: f.name,
          fieldType: f.columnType as FieldType,
          value: values[id],
        };
      });
  } catch (err) {
    logger.error("Failed to get all field values", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 10. bulkUpdateFieldValues
// ---------------------------------------------------------------------------

export async function bulkUpdateFieldValues(
  fieldId: string,
  taskIds: string[],
  value: unknown,
): Promise<number> {
  try {
    const field = await prisma.column.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error(`Field ${fieldId} not found`);

    const validation = validateFieldValue(field.columnType as FieldType, value, field.settings as Record<string, unknown> | undefined);
    if (!validation.valid) {
      throw new Error(`Invalid value for field "${field.name}": ${validation.error}`);
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskIds } },
      select: { id: true, fieldValues: true, customFieldMetadata: true },
    });

    const updates = tasks.map((task) => {
      const currentValues = parseFieldValues(task.fieldValues);
      currentValues[fieldId] = value;

      const currentMetadata = parseMetadata(task.customFieldMetadata);
      currentMetadata[fieldId] = {
        fieldType: field.columnType,
        fieldName: field.name,
        updatedAt: new Date().toISOString(),
      };

      return prisma.task.update({
        where: { id: task.id },
        data: {
          fieldValues: currentValues as object,
          customFieldMetadata: currentMetadata as object,
        },
      });
    });

    await Promise.all(updates);

    logger.info(`Bulk updated field ${fieldId} on ${updates.length} tasks`);
    return updates.length;
  } catch (err) {
    logger.error("Failed to bulk update field values", err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 11. filterTasksByField
// ---------------------------------------------------------------------------

export async function filterTasksByField(
  boardId: string,
  fieldId: string,
  operator: string,
  value: unknown,
): Promise<string[]> {
  try {
    const field = await prisma.column.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error(`Field ${fieldId} not found`);

    const tasks = await prisma.task.findMany({
      where: { boardId },
      select: { id: true, fieldValues: true },
    });

    const matched: string[] = [];

    for (const task of tasks) {
      const values = parseFieldValues(task.fieldValues);
      const fieldValue = values[fieldId];

      if (matchesFilter(fieldValue, operator, value)) {
        matched.push(task.id);
      }
    }

    return matched;
  } catch (err) {
    logger.error("Failed to filter tasks by field", err);
    throw err;
  }
}

function matchesFilter(fieldValue: unknown, operator: string, compareValue: unknown): boolean {
  switch (operator) {
    case "equals":
      return fieldValue === compareValue;
    case "not_equals":
      return fieldValue !== compareValue;
    case "contains":
      return typeof fieldValue === "string" && typeof compareValue === "string"
        ? fieldValue.toLowerCase().includes(compareValue.toLowerCase())
        : false;
    case "not_contains":
      return !(typeof fieldValue === "string" && typeof compareValue === "string"
        ? fieldValue.toLowerCase().includes(compareValue.toLowerCase())
        : false);
    case "starts_with":
      return typeof fieldValue === "string" && typeof compareValue === "string"
        ? fieldValue.toLowerCase().startsWith(compareValue.toLowerCase())
        : false;
    case "ends_with":
      return typeof fieldValue === "string" && typeof compareValue === "string"
        ? fieldValue.toLowerCase().endsWith(compareValue.toLowerCase())
        : false;
    case "gt":
      return typeof fieldValue === "number" && typeof compareValue === "number"
        ? fieldValue > compareValue
        : false;
    case "gte":
      return typeof fieldValue === "number" && typeof compareValue === "number"
        ? fieldValue >= compareValue
        : false;
    case "lt":
      return typeof fieldValue === "number" && typeof compareValue === "number"
        ? fieldValue < compareValue
        : false;
    case "lte":
      return typeof fieldValue === "number" && typeof compareValue === "number"
        ? fieldValue <= compareValue
        : false;
    case "is_empty":
      return fieldValue === null || fieldValue === undefined || fieldValue === "";
    case "is_not_empty":
      return fieldValue !== null && fieldValue !== undefined && fieldValue !== "";
    case "is_true":
      return fieldValue === true;
    case "is_false":
      return fieldValue === false || fieldValue === null || fieldValue === undefined;
    case "in":
      return Array.isArray(compareValue) && compareValue.includes(fieldValue);
    case "not_in":
      return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
    default:
      logger.warn(`Unknown filter operator: ${operator}`);
      return false;
  }
}

// ---------------------------------------------------------------------------
// 12. sortTasksByField
// ---------------------------------------------------------------------------

export async function sortTasksByField(
  boardId: string,
  fieldId: string,
  direction: "asc" | "desc",
): Promise<string[]> {
  try {
    const field = await prisma.column.findUnique({ where: { id: fieldId } });
    if (!field) throw new Error(`Field ${fieldId} not found`);

    const tasks = await prisma.task.findMany({
      where: { boardId },
      select: { id: true, fieldValues: true },
    });

    const multiplier = direction === "asc" ? 1 : -1;

    const sorted = [...tasks].sort((a, b) => {
      const aVal = parseFieldValues(a.fieldValues)[fieldId];
      const bVal = parseFieldValues(b.fieldValues)[fieldId];
      return compareForSort(aVal, bVal, multiplier);
    });

    return sorted.map((t) => t.id);
  } catch (err) {
    logger.error("Failed to sort tasks by field", err);
    throw err;
  }
}

function compareForSort(a: unknown, b: unknown, multiplier: number): number {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return multiplier * (a - b);
  }

  if (typeof a === "string" && typeof b === "string") {
    return multiplier * a.localeCompare(b);
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return multiplier * (Number(a) - Number(b));
  }

  const aStr = String(a);
  const bStr = String(b);
  return multiplier * aStr.localeCompare(bStr);
}

// ---------------------------------------------------------------------------
// 13. getFieldTypeConfig
// ---------------------------------------------------------------------------

export function getFieldTypeConfig(type: FieldType): Record<string, unknown> {
  return { ...DEFAULT_SETTINGS[type] };
}

// ---------------------------------------------------------------------------
// 14. validateFieldValue
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFieldValue(
  type: FieldType,
  value: unknown,
  settings?: Record<string, unknown>,
): ValidationResult {
  if (value === null || value === undefined) {
    return { valid: true };
  }

  switch (type) {
    case "text":
      return validateText(value, settings);
    case "number":
      return validateNumber(value, settings);
    case "date":
      return validateDate(value);
    case "status":
    case "dropdown":
      return validateDropdown(value, settings);
    case "people":
      return validatePeople(value, settings);
    case "checkbox":
      return typeof value === "boolean"
        ? { valid: true }
        : { valid: false, error: "Checkbox value must be a boolean" };
    case "link":
      return validateLink(value);
    case "email":
      return validateEmail(value);
    case "phone":
      return validatePhone(value);
    case "rating":
      return validateRating(value, settings);
    case "vote":
      return typeof value === "number" && (value === 1 || value === -1 || value === 0)
        ? { valid: true }
        : { valid: false, error: "Vote must be 1, -1, or 0" };
    case "files":
      return validateFiles(value, settings);
    case "location":
      return validateLocation(value);
    case "autoNumber":
      return typeof value === "number" && Number.isInteger(value)
        ? { valid: true }
        : { valid: false, error: "Auto number must be an integer" };
    case "formula":
      return typeof value === "number" || typeof value === "string"
        ? { valid: true }
        : { valid: false, error: "Formula result must be a number or string" };
    case "progress":
      return validateProgress(value, settings);
    case "timeTracking":
      return typeof value === "number" && value >= 0
        ? { valid: true }
        : { valid: false, error: "Time tracking must be a non-negative number (seconds)" };
    case "colorPicker":
      return typeof value === "string" && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
        ? { valid: true }
        : { valid: false, error: "Color must be a valid hex color (e.g. #FF5733)" };
    default:
      return { valid: true };
  }
}

function validateText(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Text value must be a string" };
  }
  const maxLength = (settings?.maxLength as number) || 0;
  if (maxLength > 0 && value.length > maxLength) {
    return { valid: false, error: `Text exceeds maximum length of ${maxLength}` };
  }
  return { valid: true };
}

function validateNumber(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: "Number value must be a valid number" };
  }
  if (!settings?.decimal && !Number.isInteger(value)) {
    return { valid: false, error: "Value must be a whole number" };
  }
  const min = settings?.min as number | undefined;
  const max = settings?.max as number | undefined;
  if (min !== undefined && min !== null && value < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }
  if (max !== undefined && max !== null && value > max) {
    return { valid: false, error: `Value must be at most ${max}` };
  }
  return { valid: true };
}

function validateDate(value: unknown): ValidationResult {
  if (typeof value === "string" || value instanceof Date) {
    const d = new Date(value);
    return isNaN(d.getTime())
      ? { valid: false, error: "Invalid date" }
      : { valid: true };
  }
  if (typeof value === "number") {
    return { valid: true };
  }
  return { valid: false, error: "Date must be a valid date string, Date object, or timestamp" };
}

function validateDropdown(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  const options = (settings?.options as string[]) ?? [];
  if (settings?.multiple) {
    if (!Array.isArray(value)) {
      return { valid: false, error: "Multi-select dropdown must be an array" };
    }
    const invalid = value.filter((v) => !options.includes(String(v)));
    if (invalid.length > 0 && options.length > 0) {
      return { valid: false, error: `Invalid options: ${invalid.join(", ")}` };
    }
    return { valid: true };
  }
  if (options.length > 0 && !options.includes(String(value))) {
    return { valid: false, error: `Value "${value}" is not a valid option` };
  }
  return { valid: true };
}

function validatePeople(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  if (settings?.multiple) {
    if (!Array.isArray(value)) {
      return { valid: false, error: "People value must be an array when multiple is enabled" };
    }
    return { valid: true };
  }
  if (typeof value !== "string") {
    return { valid: false, error: "People value must be a user ID string" };
  }
  return { valid: true };
}

function validateLink(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Link must be a string" };
  }
  if (value === "") return { valid: true };
  try {
    new URL(value);
    return { valid: true };
  } catch {
    return { valid: false, error: "Link must be a valid URL" };
  }
}

function validateEmail(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Email must be a string" };
  }
  if (value === "") return { valid: true };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value)
    ? { valid: true }
    : { valid: false, error: "Invalid email format" };
}

function validatePhone(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Phone must be a string" };
  }
  if (value === "") return { valid: true };
  const phoneRegex = /^[+]?[\d\s\-().]{7,20}$/;
  return phoneRegex.test(value)
    ? { valid: true }
    : { valid: false, error: "Invalid phone number format" };
}

function validateRating(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return { valid: false, error: "Rating must be an integer" };
  }
  const max = (settings?.max as number) || 5;
  if (value < 0 || value > max) {
    return { valid: false, error: `Rating must be between 0 and ${max}` };
  }
  return { valid: true };
}

function validateFiles(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: "Files must be an array" };
  }
  const maxFiles = (settings?.maxFiles as number) || 10;
  if (value.length > maxFiles) {
    return { valid: false, error: `Maximum ${maxFiles} files allowed` };
  }
  return { valid: true };
}

function validateLocation(value: unknown): ValidationResult {
  if (typeof value !== "object" || value === null) {
    return { valid: false, error: "Location must be an object with lat and lng" };
  }
  const loc = value as Record<string, unknown>;
  if (typeof loc.lat !== "number" || typeof loc.lng !== "number") {
    return { valid: false, error: "Location must have numeric lat and lng properties" };
  }
  return { valid: true };
}

function validateProgress(value: unknown, settings?: Record<string, unknown>): ValidationResult {
  if (typeof value !== "number") {
    return { valid: false, error: "Progress must be a number" };
  }
  const min = (settings?.min as number) ?? 0;
  const max = (settings?.max as number) ?? 100;
  if (value < min || value > max) {
    return { valid: false, error: `Progress must be between ${min} and ${max}` };
  }
  return { valid: true };
}
