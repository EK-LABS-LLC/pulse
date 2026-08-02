import type { Context } from "hono";
import { db } from "../db";
import {
  getAnalytics,
  getOverviewExtended,
  getSpanAnalytics,
} from "../services/analytics";
import {
  analyticsQuerySchema,
  overviewExtendedQuerySchema,
  spanAnalyticsQuerySchema,
} from "../shared/validation";
import { ZodError } from "zod";

/**
 * Handler for GET /v1/analytics
 * Get analytics for the authenticated project within a date range.
 */
export async function handleGetAnalytics(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;

  const rawQuery = c.req.query();
  let params;
  try {
    params = analyticsQuerySchema.parse(rawQuery);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json(
        { error: "Invalid query parameters", details: err.issues },
        400,
      );
    }
    throw err;
  }

  const dateRange = {
    dateFrom: new Date(params.date_from),
    dateTo: new Date(params.date_to),
  };

  const result = await getAnalytics(projectId, dateRange, db, params.group_by);
  return c.json(result, 200);
}

/**
 * Handler for GET /v1/analytics/spans
 * Get span analytics for the authenticated project within a date range.
 */
export async function handleGetSpanAnalytics(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;

  const rawQuery = c.req.query();
  let params;
  try {
    params = spanAnalyticsQuerySchema.parse(rawQuery);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json(
        { error: "Invalid query parameters", details: err.issues },
        400,
      );
    }
    throw err;
  }

  const dateRange = {
    dateFrom: new Date(params.date_from),
    dateTo: new Date(params.date_to),
  };

  const result = await getSpanAnalytics(
    projectId,
    dateRange,
    db,
    params.group_by,
  );
  return c.json(result, 200);
}

/**
 * Handler for GET /v1/analytics/overview-extended.
 * Returns the detailed time-series data consumed by the dashboard Overview.
 */
export async function handleGetOverviewExtended(c: Context): Promise<Response> {
  const projectId = c.get("projectId") as string;

  const rawQuery = c.req.query();
  let params;
  try {
    params = overviewExtendedQuerySchema.parse(rawQuery);
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json(
        { error: "Invalid query parameters", details: err.issues },
        400,
      );
    }
    throw err;
  }

  const result = await getOverviewExtended(
    projectId,
    { dateFrom: new Date(params.date_from), dateTo: new Date(params.date_to) },
    db,
    params.measure,
    params.split_by,
    params.group_by,
  );
  return c.json(result, 200);
}
