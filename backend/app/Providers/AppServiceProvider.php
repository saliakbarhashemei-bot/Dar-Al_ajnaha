<?php

namespace App\Providers;

use App\Models\Announcement;
use App\Models\Book;
use App\Models\Contributor;
use App\Models\User;
use App\Observers\ActivityLogObserver;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        User::observe(ActivityLogObserver::class);

        Relation::morphMap([
            'Book' => Book::class,
            'Contributor' => Contributor::class,
            'Announcement' => Announcement::class,
        ]);
    }
}
