<?php

namespace App\Http\Requests\Announcement\Concerns;

use App\Models\Book;

trait ValidatesAnnouncementBook
{
    /**
     * Package 09 business rules (cards 24–28). The Reprint / New Edition
     * asymmetry is intentional per the approved System Map — do not "fix".
     */
    protected function package09Rules(array $rules, ?string $type, mixed $bookId): array
    {
        // Card 24: New Book → a linked book is required (input or already stored).
        if ($type === 'New Book' && ! filled($bookId)) {
            $rules['book_id'] = ['required', 'exists:books,id'];
        }

        // Cards 25–26: Reprint → publication_date AND status in [Published, Scheduled].
        if ($type === 'Reprint' && filled($bookId)) {
            $rules['book_id'][] = function ($attr, $value, $fail) {
                $book = Book::find($value);
                if (! $book) {
                    return;
                }
                if ($book->publication_date === null) {
                    $fail('Linked book must have a publication date.');
                }
                if (! in_array($book->status, ['Published', 'Scheduled'], true)) {
                    $fail('Linked book must be Published or Scheduled.');
                }
            };
        }

        // Cards 27–28: New Edition → edition AND publication_date.
        if ($type === 'New Edition' && filled($bookId)) {
            $rules['book_id'][] = function ($attr, $value, $fail) {
                $book = Book::find($value);
                if (! $book) {
                    return;
                }
                if ($book->edition === null) {
                    $fail('Linked book must have an edition.');
                }
                if ($book->publication_date === null) {
                    $fail('Linked book must have a publication date.');
                }
            };
        }

        return $rules;
    }
}
