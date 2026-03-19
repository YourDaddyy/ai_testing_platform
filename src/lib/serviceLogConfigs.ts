// Log search configuration per service type.
// These are defined in code and cannot be changed from the UI.
// All environments (test, regression, etc.) share the same config per service.

interface ServiceLogConfig {
  encoding: string;
  grepTemplate?: string;
  logPaths?: string[];
}

export const SERVICE_LOG_CONFIGS: Record<string, ServiceLogConfig> = {
  bssp: {
    encoding: "gbk",
    grepTemplate: `{ find /bosslog1/bssp/log -maxdepth 1 -name "sfc.log.1.*$(date +%F)*" 2>/dev/null; find /bosslog1/bssp/log/trace -name "sfc*" 2>/dev/null; } | xargs -r grep -aH "{KEY}" | tail -2000`,
  },
  te: {
    encoding: "gbk",
    grepTemplate: `find /bosslog1/applog/bm -maxdepth 2 -name "BM_TE_SERVICE*" | xargs -r grep -aH "{KEY}" | tail -2000`,
  },
  sac: {
    encoding: "gbk",
  },
  cmc: {
    encoding: "gbk",
  },
  bop: {
    encoding: "utf8",
    logPaths: ["/bossapp1/TongWeb4.0/bin/boss_record_public.log"],
  },
  container: {
    encoding: "utf8",
  },
};
