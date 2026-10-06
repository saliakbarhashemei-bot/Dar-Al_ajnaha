<?php

namespace App\Support;

class WorkflowStates
{
    /**
     * Single source of truth for the book and announcement workflow.
     *
     * Used by the form requests, the seeder and the scheduled-publish command
     * so the allowed set cannot drift between them.
     */
    public const BOOK_STATUSES = [
        'Draft',
        'Review',
        'Scheduled',
        'Published',
        'Archived',
    ];

    public const ANNOUNCEMENT_STATUSES = self::BOOK_STATUSES;

    public const ANNOUNCEMENT_TYPES = [
        'New Book',
        'Reprint',
        'New Edition',
        'News',
        'Event',
        'Discount',
        'Other',
    ];
}
