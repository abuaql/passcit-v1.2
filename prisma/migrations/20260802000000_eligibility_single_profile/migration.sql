-- One eligibility profile per user.
--
-- Written to be safe against an existing database, and safe to run again after
-- a partial failure: every step checks current state first, so a re-run is a
-- no-op rather than an error.
--
-- ORDER MATTERS HERE. InnoDB requires an index on any column used by a foreign
-- key, and `EligibilityCalculation_userId_fkey` is backed by
-- `EligibilityCalculation_userId_idx`. Dropping that index first fails with
-- "Cannot drop index ... needed in a foreign key constraint" (MySQL error
-- 1553). Creating the UNIQUE index BEFORE dropping the old one means the
-- foreign key always has an index available -- MySQL switches to the unique
-- index, and the old one can then be dropped cleanly. The foreign key itself
-- is never dropped or recreated, so referential integrity is never even
-- momentarily absent.

-- 1. Collapse pre-existing duplicates down to the most recent calculation per
--    user, so the unique index cannot fail on historical rows. A row is
--    deleted only when a strictly newer row exists for the same user; ties on
--    createdAt are broken deterministically by id, so exactly one row per user
--    always survives. Rows with userId IS NULL (calculations made while signed
--    out) are never touched. Naturally idempotent: once it has run no row has a
--    strictly newer sibling, so a second run deletes nothing.
DELETE stale
FROM `EligibilityCalculation` stale
INNER JOIN `EligibilityCalculation` newer
  ON stale.`userId` = newer.`userId`
 AND stale.`userId` IS NOT NULL
 AND (
   newer.`createdAt` > stale.`createdAt`
   OR (newer.`createdAt` = stale.`createdAt` AND newer.`id` > stale.`id`)
 );

-- 2. Create the unique index FIRST, only if it is not already present.
--    MySQL permits multiple NULLs in a UNIQUE index, which is exactly the
--    behaviour wanted: one profile per signed-in user, no constraint on
--    anonymous calculations.
SET @has_unique_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'EligibilityCalculation'
    AND INDEX_NAME = 'EligibilityCalculation_userId_key'
);

SET @create_unique_index := IF(
  @has_unique_index = 0,
  'CREATE UNIQUE INDEX `EligibilityCalculation_userId_key` ON `EligibilityCalculation`(`userId`)',
  'DO 0'
);

PREPARE stmt FROM @create_unique_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Only now drop the old non-unique index, and only if it still exists. The
--    foreign key is already backed by the unique index created above, so this
--    succeeds instead of raising MySQL 1553.
SET @has_old_index := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'EligibilityCalculation'
    AND INDEX_NAME = 'EligibilityCalculation_userId_idx'
);

SET @drop_old_index := IF(
  @has_old_index > 0,
  'DROP INDEX `EligibilityCalculation_userId_idx` ON `EligibilityCalculation`',
  'DO 0'
);

PREPARE stmt FROM @drop_old_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
