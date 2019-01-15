<?php

namespace App\Http\Controllers;

use App\Bibliography;
use App\Entity;
use App\File;
use App\Geodata;
use App\ThConceptLabel;
use App\ThLanguage;
use Illuminate\Http\Request;


class SearchController extends Controller {
    private static $shebangPrefix = [
        'bibliography' => '!b ',
        'entities' => '!e ',
        'files' => '!f ',
        'geodata' => '!g ',
    ];

    public function searchGlobal(Request $request) {
        $user = auth()->user();
        if(!$user->can('view_concepts')) {
            return response()->json([
                'error' => __('You do not have the permission to search global')
            ], 403);
        }
        $q = $request->query('q');
        if(starts_with($q, self::$shebangPrefix['bibliography'])) {
            $matches = Bibliography::search(str_after($q, self::$shebangPrefix['bibliography']))->get();
            $matches->map(function($m) {
                $m->group = 'bibliography';
                return $m;
            });
        } else if(starts_with($q, self::$shebangPrefix['entities'])) {
            $matches = Entity::search(str_after($q, self::$shebangPrefix['entities']))->get();
            $matches->map(function($m) {
                $m->group = 'entities';
                return $m;
            });
        } else if(starts_with($q, self::$shebangPrefix['files'])) {
            $files = File::search(str_after($q, self::$shebangPrefix['files']));
            $matches = $files->get();
            $matches->map(function($m) {
                $m->group = 'files';
                $m->setFileInfo();
                return $m;
            });
        } else if(starts_with($q, self::$shebangPrefix['geodata'])) {
            $matches = Geodata::search(str_after($q, self::$shebangPrefix['geodata']))->get();
            $matches->map(function($m) {
                $m->group = 'geodata';
                return $m;
            });
        } else {
            $files = File::search($q);
            $files = $files->get();
            $files->map(function($f) {
                $f->group = 'files';
                $f->setFileInfo();
                return $f;
            });
            $entities = Entity::search($q)->get();
            $entities->map(function($e) {
                $e->group = 'entities';
                return $e;
            });
            $geodata = Geodata::search($q)->get();
            $geodata->map(function($g) {
                $g->group = 'geodata';
                return $g;
            });
            $bibliography = Bibliography::search($q)->get();
            $bibliography->map(function($b) {
                $b->group = 'bibliography';
                return $b;
            });
            $matches = $files->concat($entities)
                ->concat($geodata)
                ->concat($bibliography)
                ->sortByDesc('relevance')
                ->values()
                ->all();
        }
        return response()->json($matches);
    }

    public function searchEntityByName(Request $request) {
        $user = auth()->user();
        if(!$user->can('view_concepts')) {
            return response()->json([
                'error' => __('You do not have the permission to search for entities')
            ], 403);
        }
        $q = $request->query('q');
        $matches = Entity::where('name', 'ilike', '%'.$q.'%')
            ->orderBy('name')
            ->get();
        $matches->each->append(['ancestors']);
        return response()->json($matches);
    }

    public function searchInThesaurus(Request $request) {
        $q = $request->query('q');
        $lang = auth()->user()->getLanguage();
        $langId = ThLanguage::where('short_name', $lang)->value('id');
        $matches = ThConceptLabel::where('label', 'ilike', '%'.$q.'%')
            ->where('language_id', $langId)
            ->with('concept')
            ->get();
        return response()->json($matches);
    }
}