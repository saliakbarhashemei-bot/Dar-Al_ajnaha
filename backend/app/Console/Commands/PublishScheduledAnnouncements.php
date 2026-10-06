<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use Illuminate\Console\Command;

class PublishScheduledAnnouncements extends Command
{
    protected $signature = 'announcements:publish-scheduled';

    protected $description = 'Publish scheduled announcements whose scheduled_at has passed.';

    public function handle(): int
    {
        $count = Announcement::where('status', 'Scheduled')
            ->where('scheduled_at', '<=', now())
            ->update(['status' => 'Published', 'published_at' => now()]);

        $this->info("Published {$count} announcement(s).");

        return self::SUCCESS;
    }
}
