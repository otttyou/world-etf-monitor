import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getSnapshot } from "./market-snapshot";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  market: router({
    etfPrices: publicProcedure.query(async () => (await getSnapshot()).etfs),
    regionalIndices: publicProcedure.query(async () => (await getSnapshot()).regions),
    fxRates: publicProcedure.query(async () => (await getSnapshot()).fx),
    sectorData: publicProcedure.query(async () => (await getSnapshot()).sectors),
    factors: publicProcedure.query(async () => (await getSnapshot()).factors),
    correlation: publicProcedure.query(async () => (await getSnapshot()).correlation),
    radar: publicProcedure.query(async () => {
      const s = await getSnapshot();
      return { current: s.radar, prior: s.priorRadar };
    }),
    volatility: publicProcedure.query(async () => (await getSnapshot()).volatility),

    refreshETFData: publicProcedure.mutation(async () => {
      await getSnapshot(true);
      return { success: true };
    }),
    refreshRegionalData: publicProcedure.mutation(async () => {
      await getSnapshot(true);
      return { success: true };
    }),
    refreshFXData: publicProcedure.mutation(async () => {
      await getSnapshot(true);
      return { success: true };
    }),
    refreshSectorData: publicProcedure.mutation(async () => {
      await getSnapshot(true);
      return { success: true };
    }),
    refresh: publicProcedure.mutation(async () => {
      await getSnapshot(true);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
