<?php

/**
 * Enforce the Phase 7 section 1.1 coverage targets per area.
 *
 * Reads a PHPUnit Clover report and fails when any area is below its target.
 * Run via `composer test:coverage`, which needs Xdebug or PCOV.
 *
 * Usage: php scripts/check-coverage.php build/logs/clover.xml
 */
$reportPath = $argv[1] ?? 'build/logs/clover.xml';

if (! is_file($reportPath)) {
    fwrite(STDERR, "Coverage report not found: {$reportPath}\n");
    fwrite(STDERR, "Run: php artisan test --coverage --log-junit build/junit.xml --coverage-clover {$reportPath}\n");

    exit(2);
}

/**
 * Keyed by the path segment that identifies the area. Matched against the
 * Clover `name` attribute, which is namespace-relative
 * (`App\Services\MediaRules.php`) or a full path depending on the PHPUnit
 * version, so matching is done on a segment rather than a prefix.
 */
$targets = [
    'Services' => 80.0,
    'Policies' => 90.0,
    'Http/Controllers' => 70.0,
    'Models' => 60.0,
];

$xml = simplexml_load_file($reportPath);

if ($xml === false) {
    fwrite(STDERR, "Could not parse coverage report: {$reportPath}\n");

    exit(2);
}

$areas = [];

foreach ($xml->project->file as $file) {
    $name = str_replace('\\', '/', (string) $file['name']);

    foreach ($targets as $segment => $target) {
        if (! str_contains($name, "/{$segment}/")) {
            continue;
        }

        $metrics = $file->metrics;

        $statements = (int) ($metrics['statements'] ?? 0);
        $covered = (int) ($metrics['coveredstatements'] ?? 0);

        if ($statements === 0) {
            continue;
        }

        $areas[$segment]['statements'] = ($areas[$segment]['statements'] ?? 0) + $statements;
        $areas[$segment]['covered'] = ($areas[$segment]['covered'] ?? 0) + $covered;

        break;
    }
}

$failed = false;
$rows = [];

foreach ($targets as $segment => $target) {
    $statements = $areas[$segment]['statements'] ?? 0;
    $covered = $areas[$segment]['covered'] ?? 0;

    if ($statements === 0) {
        $rows[] = ["app/{$segment}", $target, null, 'no executable statements'];

        $failed = true;

        continue;
    }

    $percent = $covered / $statements * 100;
    $status = $percent >= $target ? 'PASS' : 'FAIL';

    if ($status === 'FAIL') {
        $failed = true;
    }

    $rows[] = ["app/{$segment}", $target, $percent, $status];
}

$width = max(array_map(fn (array $row) => strlen((string) $row[0]), $rows));

printf("%-{$width}s  %7s  %10s  %s\n", 'Area', 'Target', 'Actual', 'Status');
printf("%s  %s  %s  %s\n", str_repeat('-', $width), str_repeat('-', 7), str_repeat('-', 10), str_repeat('-', 6));

foreach ($rows as [$prefix, $target, $percent, $status]) {
    printf(
        "%-{$width}s  %6.1f%%  %10s  %s\n",
        $prefix,
        $target,
        $percent === null ? 'n/a' : number_format($percent, 2).'%',
        $status
    );
}

if ($failed) {
    fwrite(STDERR, "\nCoverage targets not met.\n");

    exit(1);
}

echo "\nAll coverage targets met.\n";

exit(0);
