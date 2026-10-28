const { Prisma } = require('@prisma/client');
const prisma = require('../../../config/db');
const { BUSINESS_TZ } = require('./reportDateUtils');
const { STATUS_BUCKETS } = require('./reportConstants');

//Filters
function buildFilters(filters) {
  let sourceFilter = Prisma.empty;
  if (filters.sourceIds && filters.sourceIds.length > 0) {
    sourceFilter = Prisma.sql`AND resolved_source_id IN (${Prisma.join(filters.sourceIds)})`;
  }
  let sourceDetailFilter = Prisma.empty;
  if (filters.sourceDetailIds && filters.sourceDetailIds.length > 0) {
    sourceDetailFilter = Prisma.sql`AND resolved_source_detail_id IN (${Prisma.join(filters.sourceDetailIds)})`;
  }
  let majorFilter = Prisma.empty;
  if (filters.majorInterestTypes && filters.majorInterestTypes.length > 0) {
    majorFilter = Prisma.sql`AND resolved_major_key IN (${Prisma.join(filters.majorInterestTypes)})`;
  }
  let regionFilter = Prisma.empty;
  if (filters.regionGroups && filters.regionGroups.length > 0) {
    regionFilter = Prisma.sql`AND resolved_region_group::text IN (${Prisma.join(filters.regionGroups)})`;
  }
  let oldProvinceFilter = Prisma.empty;
  if (filters.oldProvinceIds && filters.oldProvinceIds.length > 0) {
    oldProvinceFilter = Prisma.sql`AND resolved_old_province_id IN (${Prisma.join(filters.oldProvinceIds)})`;
  }

  return Prisma.sql`
    ${sourceFilter}
    ${sourceDetailFilter}
    ${majorFilter}
    ${regionFilter}
    ${oldProvinceFilter}
  `;
}

//Build scope condition
function buildScopeCondition(scope) {
  if (!scope || scope.mode === 'none') return Prisma.sql`FALSE`;
  if (scope.mode === 'all') return Prisma.sql`TRUE`;

  const conditions = [];

  if (scope.authorizedAccountIds && scope.authorizedAccountIds.length > 0) {
    conditions.push(Prisma.sql`i.assigned_to_id IN (${Prisma.join(scope.authorizedAccountIds)})`);
  }

  if (scope.assignedToIds && scope.assignedToIds.length > 0) {
    conditions.push(Prisma.sql`i.assigned_to_id IN (${Prisma.join(scope.assignedToIds)})`);
  }

  if (conditions.length === 0) {
    return Prisma.sql`FALSE`;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return Prisma.sql`(${conditions[0]} OR ${conditions[1]})`;
}

//Base cte for report
const baseCte = (scopeCondition, filterCondition) => Prisma.sql`
WITH RECURSIVE
resolved_status AS (
  SELECT
    leaf.id AS status_data_id,
    COALESCE(interaction.name, general.name, leaf.name) AS interaction_status,
    CASE
      WHEN interaction.id IS NOT NULL THEN general.name
      WHEN general.id IS NOT NULL THEN leaf.name
      ELSE NULL
    END AS general_status,
    CASE
      WHEN interaction.id IS NOT NULL THEN leaf.name
      ELSE NULL
    END AS detail_status
  FROM status_data leaf
  LEFT JOIN status_data general ON leaf.parent_id = general.id
  LEFT JOIN status_data interaction ON general.parent_id = interaction.id
),
SourceHierarchy AS (
  SELECT id, name, level, parent_id, id AS base_id
  FROM source_data
  UNION ALL
  SELECT s.id, s.name, s.level, s.parent_id, h.base_id
  FROM source_data s
  INNER JOIN SourceHierarchy h ON h.parent_id = s.id
),
MajorHierarchy AS (
  SELECT id, name, level, parent_id, id AS base_id
  FROM major_data
  UNION ALL
  SELECT m.id, m.name, m.level, m.parent_id, h.base_id
  FROM major_data m
  INNER JOIN MajorHierarchy h ON h.parent_id = m.id
),
InquiryBase AS (
  SELECT 
    i.id,
    i.created_at,
    i.first_processed_at,
    i.first_interacted_at,
    i.nb_at,
    i.assigned_to_id,
    rs.interaction_status,
    rs.general_status,
    (SELECT id FROM SourceHierarchy WHERE base_id = i.source_data_id AND level = 'source' LIMIT 1) AS resolved_source_id,
    (SELECT id FROM SourceHierarchy WHERE base_id = i.source_data_id AND level = 'source_detail' LIMIT 1) AS resolved_source_detail_id,
    (SELECT m2.name FROM MajorHierarchy mh JOIN major_data m2 ON m2.id = mh.id WHERE mh.base_id = COALESCE(sr.interested_major_id, sr.specific_major_id) AND mh.level = 'interested_major' LIMIT 1) AS resolved_major_key,
    (SELECT m2.label FROM MajorHierarchy mh JOIN major_data m2 ON m2.id = mh.id WHERE mh.base_id = COALESCE(sr.interested_major_id, sr.specific_major_id) AND mh.level = 'interested_major' LIMIT 1) AS resolved_major_label,
    se.province_group AS resolved_region_group,
    sc.old_province_id AS resolved_old_province_id
  FROM inquiry i
  LEFT JOIN student st ON i.student_id = st.id
  LEFT JOIN specialized_register sr ON st.specialized_register_id = sr.id
  LEFT JOIN student_education se ON st.id = se.student_id
  LEFT JOIN school sc ON se.school_id = sc.id
  LEFT JOIN resolved_status rs ON i.status_data_id = rs.status_data_id
  WHERE ${scopeCondition}
),
FilteredInquiry AS (
  SELECT *
  FROM InquiryBase
  WHERE 1=1
    ${filterCondition}
)
`;

const getSummaryCounts = async (scope, { fromInstant, toExclusiveInstant }, filters) => {
  const scopeCond = buildScopeCondition(scope);
  const filterCond = buildFilters(filters);
  const cte = baseCte(scopeCond, filterCond);

  const res = await prisma.$queryRaw`
    ${cte}
    SELECT
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.created_at >= ${fromInstant}::timestamptz 
          AND fi.created_at < ${toExclusiveInstant}::timestamptz
      )::int AS total,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
      )::int AS processed,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.first_interacted_at IS NOT NULL
          AND fi.first_interacted_at < ${toExclusiveInstant}::timestamptz
      )::int AS interacted,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.nb_at IS NOT NULL
          AND fi.nb_at < ${toExclusiveInstant}::timestamptz
      )::int AS nb
    FROM FilteredInquiry fi;
  `;
  return res[0] || { total: 0, processed: 0, interacted: 0, nb: 0 };
};

const getTimelineCounts = async (scope, { fromInstant, toExclusiveInstant }, filters) => {
  const scopeCond = buildScopeCondition(scope);
  const filterCond = buildFilters(filters);
  const cte = baseCte(scopeCond, filterCond);

  const [processedTimeline, interactedTimeline, nbTimeline] = await Promise.all([
    prisma.$queryRaw`
      ${cte}
      SELECT
        to_char(event_time AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM') AS month_val,
        COUNT(DISTINCT inquiry_id)::int AS count_val
      FROM (
        SELECT
          ish.inquiry_id,
          ish.changed_at AS event_time
        FROM inquiry_status_history ish
        JOIN FilteredInquiry fi ON fi.id = ish.inquiry_id
        JOIN resolved_status rs ON rs.status_data_id = ish.new_status_id
        WHERE ish.changed_at >= ${fromInstant}::timestamptz
          AND ish.changed_at < ${toExclusiveInstant}::timestamptz
          AND rs.interaction_status IN ('interacted', 'not_interacted', 'not_interested', 'wrong_number')

        UNION ALL

        SELECT
          fi.id AS inquiry_id,
          fi.first_processed_at AS event_time
        FROM FilteredInquiry fi
        WHERE fi.first_processed_at IS NOT NULL
          AND fi.first_processed_at >= ${fromInstant}::timestamptz
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND NOT EXISTS (
            SELECT 1 FROM inquiry_status_history ish WHERE ish.inquiry_id = fi.id
          )
      ) t
      GROUP BY month_val
    `,
    prisma.$queryRaw`
      ${cte}
      SELECT
        to_char(event_time AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM') AS month_val,
        COUNT(DISTINCT inquiry_id)::int AS count_val
      FROM (
        SELECT
          ish.inquiry_id,
          ish.changed_at AS event_time
        FROM inquiry_status_history ish
        JOIN FilteredInquiry fi ON fi.id = ish.inquiry_id
        JOIN resolved_status rs ON rs.status_data_id = ish.new_status_id
        WHERE ish.changed_at >= ${fromInstant}::timestamptz
          AND ish.changed_at < ${toExclusiveInstant}::timestamptz
          AND rs.interaction_status = 'interacted'

        UNION ALL

        SELECT
          fi.id AS inquiry_id,
          fi.first_interacted_at AS event_time
        FROM FilteredInquiry fi
        WHERE fi.first_interacted_at IS NOT NULL
          AND fi.first_interacted_at >= ${fromInstant}::timestamptz
          AND fi.first_interacted_at < ${toExclusiveInstant}::timestamptz
          AND fi.interaction_status = 'interacted'
          AND NOT EXISTS (
            SELECT 1 FROM inquiry_status_history ish WHERE ish.inquiry_id = fi.id
          )
      ) t
      GROUP BY month_val
    `,
    prisma.$queryRaw`
      ${cte}
      SELECT
        to_char(event_time AT TIME ZONE ${BUSINESS_TZ}, 'YYYY-MM') AS month_val,
        COUNT(DISTINCT inquiry_id)::int AS count_val
      FROM (
        SELECT
          ish.inquiry_id,
          ish.changed_at AS event_time
        FROM inquiry_status_history ish
        JOIN FilteredInquiry fi ON fi.id = ish.inquiry_id
        JOIN resolved_status rs ON rs.status_data_id = ish.new_status_id
        WHERE ish.changed_at >= ${fromInstant}::timestamptz
          AND ish.changed_at < ${toExclusiveInstant}::timestamptz
          AND rs.general_status = 'payment_completed_nb'

        UNION ALL

        SELECT
          fi.id AS inquiry_id,
          fi.nb_at AS event_time
        FROM FilteredInquiry fi
        WHERE fi.nb_at IS NOT NULL
          AND fi.nb_at >= ${fromInstant}::timestamptz
          AND fi.nb_at < ${toExclusiveInstant}::timestamptz
          AND fi.general_status = 'payment_completed_nb'
          AND NOT EXISTS (
            SELECT 1 FROM inquiry_status_history ish WHERE ish.inquiry_id = fi.id
          )
      ) t
      GROUP BY month_val
    `
  ]);

  return { processedTimeline, interactedTimeline, nbTimeline };
};

const getStaffCounts = async (scope, { fromInstant, toExclusiveInstant }, filters) => {
  const scopeCond = buildScopeCondition(scope);
  const filterCond = buildFilters(filters);
  const cte = baseCte(scopeCond, filterCond);

  const statusFilters = Object.entries(STATUS_BUCKETS).map(([key, info]) => {
    const levelCol = info.level === 'general' ? Prisma.raw('fi.general_status') : Prisma.raw('fi.interaction_status');
    return Prisma.sql`,
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND ${levelCol} = ${key}
      )::int AS ${Prisma.raw(`"${info.field}"`)}
    `;
  });

  return await prisma.$queryRaw`
    ${cte}
    SELECT
      a.id AS "advisorId",
      a.full_name AS "advisorName",
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
      )::int AS processed,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.first_interacted_at IS NOT NULL
          AND fi.first_interacted_at < ${toExclusiveInstant}::timestamptz
      )::int AS interacted,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.nb_at IS NOT NULL
          AND fi.nb_at < ${toExclusiveInstant}::timestamptz
      )::int AS nb
      ${Prisma.join(statusFilters, '')}

    FROM account a
    INNER JOIN FilteredInquiry fi ON fi.assigned_to_id = a.id
    GROUP BY a.id, a.full_name
    ORDER BY a.full_name ASC;
  `;
};

const getMajorCounts = async (scope, { fromInstant, toExclusiveInstant }, filters) => {
  const scopeCond = buildScopeCondition(scope);
  const filterCond = buildFilters(filters);
  const cte = baseCte(scopeCond, filterCond);

  const statusFilters = Object.entries(STATUS_BUCKETS).map(([key, info]) => {
    const levelCol = info.level === 'general' ? Prisma.raw('fi.general_status') : Prisma.raw('fi.interaction_status');
    return Prisma.sql`,
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND ${levelCol} = ${key}
      )::int AS ${Prisma.raw(`"${info.field}"`)}
    `;
  });

  return await prisma.$queryRaw`
    ${cte}
    SELECT
      fi.resolved_major_key AS "majorKey",
      fi.resolved_major_label AS "majorLabel",
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.created_at >= ${fromInstant}::timestamptz 
          AND fi.created_at < ${toExclusiveInstant}::timestamptz
      )::int AS total,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
      )::int AS processed,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.first_interacted_at IS NOT NULL
          AND fi.first_interacted_at < ${toExclusiveInstant}::timestamptz
      )::int AS interacted,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.nb_at IS NOT NULL
          AND fi.nb_at < ${toExclusiveInstant}::timestamptz
      )::int AS nb,

      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.interaction_status = 'pending'
      )::int AS "unprocessed"

      ${Prisma.join(statusFilters, '')}

    FROM FilteredInquiry fi
    WHERE fi.resolved_major_key IS NOT NULL
    GROUP BY fi.resolved_major_key, fi.resolved_major_label
    HAVING COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.created_at >= ${fromInstant}::timestamptz 
        AND fi.created_at < ${toExclusiveInstant}::timestamptz
    ) > 0
    OR COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
        AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
    ) > 0
    OR COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.interaction_status = 'pending'
    ) > 0;
  `;
};

const getSourceCounts = async (scope, { fromInstant, toExclusiveInstant }, filters) => {
  const scopeCond = buildScopeCondition(scope);
  const filterCond = buildFilters(filters);
  const cte = baseCte(scopeCond, filterCond);

  const statusFilters = Object.entries(STATUS_BUCKETS).map(([key, info]) => {
    const levelCol = info.level === 'general' ? Prisma.raw('fi.general_status') : Prisma.raw('fi.interaction_status');
    return Prisma.sql`,
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND ${levelCol} = ${key}
      )::int AS ${Prisma.raw(`"${info.field}"`)}
    `;
  });

  return await prisma.$queryRaw`
    ${cte}
    SELECT
      s.id AS "sourceDetailId",
      s.name AS "sourceDetailKey",
      s.label AS "sourceDetailLabel",
      p.id AS "sourceId",
      p.name AS "sourceKey",
      p.label AS "sourceLabel",

      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
      )::int AS "processedCohortCount",

      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.interaction_status = 'pending'
      )::int AS "unprocessed"

      ${Prisma.join(statusFilters, '')}

    FROM FilteredInquiry fi
    JOIN source_data p ON p.id = fi.resolved_source_id
    LEFT JOIN source_data s ON s.id = fi.resolved_source_detail_id
    GROUP BY p.id, p.name, p.label, p.sort_order, s.id, s.name, s.label, s.sort_order
    HAVING COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
        AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
    ) > 0
    OR COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.interaction_status = 'pending'
    ) > 0
    ORDER BY p.sort_order ASC, s.sort_order ASC NULLS FIRST;
  `;
};

const getRegionCounts = async (scope, { fromInstant, toExclusiveInstant }, filters) => {
  const scopeCond = buildScopeCondition(scope);
  const filterCond = buildFilters(filters);
  const cte = baseCte(scopeCond, filterCond);

  const statusFilters = Object.entries(STATUS_BUCKETS).map(([key, info]) => {
    const levelCol = info.level === 'general' ? Prisma.raw('fi.general_status') : Prisma.raw('fi.interaction_status');
    return Prisma.sql`,
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND ${levelCol} = ${key}
      )::int AS ${Prisma.raw(`"${info.field}"`)}
    `;
  });

  return await prisma.$queryRaw`
    ${cte}
    SELECT
      fi.resolved_region_group::text AS "regionGroup",
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.created_at >= ${fromInstant}::timestamptz 
          AND fi.created_at < ${toExclusiveInstant}::timestamptz
      )::int AS total,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
      )::int AS processed,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.first_interacted_at IS NOT NULL
          AND fi.first_interacted_at < ${toExclusiveInstant}::timestamptz
      )::int AS interacted,
      
      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
          AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
          AND fi.nb_at IS NOT NULL
          AND fi.nb_at < ${toExclusiveInstant}::timestamptz
      )::int AS nb,

      COUNT(DISTINCT fi.id) FILTER (
        WHERE fi.interaction_status = 'pending'
      )::int AS "unprocessed"

      ${Prisma.join(statusFilters, '')}

    FROM FilteredInquiry fi
    WHERE fi.resolved_region_group IS NOT NULL
    GROUP BY fi.resolved_region_group
    HAVING COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.created_at >= ${fromInstant}::timestamptz 
        AND fi.created_at < ${toExclusiveInstant}::timestamptz
    ) > 0
    OR COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.first_processed_at >= ${fromInstant}::timestamptz 
        AND fi.first_processed_at < ${toExclusiveInstant}::timestamptz
    ) > 0
    OR COUNT(DISTINCT fi.id) FILTER (
      WHERE fi.interaction_status = 'pending'
    ) > 0;
  `;
};

module.exports = {
  getSummaryCounts,
  getTimelineCounts,
  getStaffCounts,
  getMajorCounts,
  getSourceCounts,
  getRegionCounts
};
