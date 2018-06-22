<?php

namespace App;

use App\ContextFile;
use App\Helpers;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use lsolesen\pel\Pel;
use lsolesen\pel\PelJpeg;
use lsolesen\pel\PelTiff;
use lsolesen\pel\PelTag;
use lsolesen\pel\PelIfd;
use lsolesen\pel\PelDataWindow;
use lsolesen\pel\PelDataWindowOffsetException;
use lsolesen\pel\PelJpegInvalidMarkerException;
use wapmorgan\UnifiedArchive\UnifiedArchive;

class File extends Model
{
    protected $table = 'photos';
    /**
     * The attributes that are assignable.
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'modified',
        'cameraname',
        'photographer_id',
        'created',
        'thumb',
        'orientation',
        'copyright',
        'description',
        'lasteditor',
    ];

    protected $appends = [
        'category',
        'exif'
    ];


    private const THUMB_SUFFIX = "_thumb";
    private const THUMB_WIDTH = 256;
    private const EXP_SUFFIX = ".jpg";
    private const EXP_FORMAT = "jpg";

    public static function applyFilters($builder, $filters) {
        if(isset($filters['strategy'])) {
            $strategy = $filters['strategy'];
            unset($filters['strategy']);
        }
        foreach($filters as $col => $fs) {
            switch($col) {
                case 'categories':
                    foreach($fs as $f) {
                        switch($f) {
                            case 'image':
                                $builder = self::addImages($builder, true);
                                break;
                            case 'audio':
                                $builder = self::addAudio($builder, true);
                                break;
                            case 'video':
                                $builder = self::addVideo($builder, true);
                                break;
                            case 'pdf':
                                $builder = self::addPdfs($builder, true);
                                break;
                            case 'xml':
                                $builder = self::addXmls($builder, true);
                                break;
                            case 'html':
                                $builder = self::addHtmls($builder, true);
                                break;
                            case '3d':
                                $builder = self::add3d($builder, true);
                                break;
                            case 'dicom':
                                $builder = self::addDicom($builder, true);
                                break;
                            case 'archive':
                                $builder = self::addArchives($builder, true);
                                break;
                            case 'text':
                                $builder = self::addTexts($builder, true);
                                break;
                            case 'document':
                                $builder = self::addDocuments($builder, true);
                                break;
                            case 'spreadsheet':
                                $builder = self::addSpreadsheets($builder, true);
                                break;
                            case 'presentation':
                                $builder = self::addPresentations($builder, true);
                                break;
                        }
                    }
                    break;
                case 'cameras':
                    $builder->where(function($query) use($fs) {
                        foreach($fs as $f) {
                            $query->orWhere('cameraname', $f);
                        }
                    });
                    break;
                case 'dates':
                    $builder->where(function($query) use($fs) {
                        foreach($fs as $f) {
                            $query->orWhereDate('created', $f);
                        }
                    });
                    break;
            }
        }
        return $builder;
    }

    public static function getAllPaginate($page, $filters) {
        $files = self::with(['contexts'])
            ->orderBy('id', 'asc');
        $files->where(function($subQuery) use ($filters) {
            self::applyFilters($subQuery, $filters);
        });
        $files = $files->paginate();
        $files->withPath('/file');

        foreach($files as &$file) {
            $file->setFileInfo();
        }

        return $files;
    }

    public static function getUnlinkedPaginate($page, $filters) {
        $files = self::with(['contexts'])
            ->orderBy('id', 'asc')
            ->doesntHave('contexts');
        $files->where(function($subQuery) use ($filters) {
            self::applyFilters($subQuery, $filters);
        });
        $files = $files->paginate();
        $files->withPath('/file/unlinked');

        foreach($files as &$file) {
            $file->setFileInfo();
        }

        return $files;
    }

    public static function getLinkedPaginate($cid, $page, $filters) {
        $files = self::with(['contexts'])
            ->whereHas('contexts', function($query) use($cid, $filters) {
                $query->where('context_id', $cid);
                $subs = $filters['sub_entities'];
                if(isset($subs) && Helpers::parseBoolean($subs)) {
                    $query->orWhere('root_context_id', $cid);
                }
            })
            ->orderBy('id', 'asc');
        $files->where(function($subQuery) use ($filters) {
            self::applyFilters($subQuery, $filters);
        });
        $files = $files->paginate();
        $files->withPath('/file/linked/'.$cid);

        foreach($files as &$file) {
            $file->setFileInfo();
        }

        return $files;
    }

    public static function createFromUpload($input) {
        $filename = $input->getClientOriginalName();
        $ext = $input->getClientOriginalExtension();
        // filename without extension, but with trailing '.'
        $baseFilename = substr($filename, 0, strlen($filename)-strlen($ext));
        $cnt = 1;
        while(Storage::exists($filename)) {
            $filename = "$baseFilename$cnt.$ext";
            $cnt++;
        }
        $filehandle = fopen($input->getRealPath(), 'r');
        Storage::put(
            $filename,
            $filehandle
        );
        fclose($filehandle);

        $mimeType = $input->getMimeType();
        $fileUrl = Helpers::getStorageFilePath($filename);
        $lastModified = date('Y-m-d H:i:s', filemtime($fileUrl));

        $file = new File();
        $file->modified = $lastModified;
        $file->lasteditor = 'Admin'; // TODO
        $file->mime_type = $mimeType;
        $file->name = $filename;
        $file->created = $lastModified;

        $file->save();

        if($file->isImage()) {
            $nameNoExt = pathinfo($filename, PATHINFO_FILENAME);
            $thumbFilename = $nameNoExt . self::THUMB_SUFFIX . self::EXP_SUFFIX;

            $imageInfo = getimagesize($fileUrl);
            $width = $imageInfo[0];
            $height = $imageInfo[1];
            $mime = $imageInfo[2];//$imageInfo['mime'];
            if($width > self::THUMB_WIDTH) {
                switch($mime) {
                    case IMAGETYPE_JPEG:
                        $image = imagecreatefromjpeg($fileUrl);
                        break;
                    case IMAGETYPE_PNG:
                        $image = imagecreatefrompng($fileUrl);
                        break;
                    case IMAGETYPE_GIF:
                        $image = imagecreatefromgif($fileUrl);
                        break;
                    default:
                        // use imagemagick to convert from unsupported file format to jpg, which is supported by native php
                        $im = new Imagick($fileUrl);
                        $fileUrl = Helpers::getStorageFilePath($nameNoExt . self::EXP_SUFFIX);
                        $im->setImageFormat(self::EXP_FORMAT);
                        $im->writeImage($fileUrl);
                        $im->clear();
                        $im->destroy();
                        $image = imagecreatefromjpeg($fileUrl);
                }
                $scaled = imagescale($image, self::THUMB_WIDTH);
                ob_start();
                imagejpeg($scaled);
                $image = ob_get_clean();
                Storage::put(
                    $thumbFilename,
                    $image
                );
            } else {
                Storage::copy($filename, $thumbFilename);
            }
            $file->thumb = $thumbFilename;
            $file->photographer_id = 1;

            if($mime === IMAGETYPE_JPEG || $mime === IMAGETYPE_TIFF_II || $mime === IMAGETYPE_TIFF_MM) {
                $exif = @exif_read_data($fileUrl, 'ANY_TAG', true);
                if($exif !== false) {
                    if(Helpers::exifDataExists($exif, 'IFD0', 'Make')) {
                        $make = $exif['IFD0']['Make'];
                    }
                    if(Helpers::exifDataExists($exif, 'IFD0', 'Model')) {
                        $model = $exif['IFD0']['Model'];
                    } else {
                        $model = '';
                    }
                    if(isset($make)) {
                        $model = $model . " ($make)";
                    }
                    $file->cameraname = $model;

                    if(Helpers::exifDataExists($exif, 'IFD0', 'Orientation')) {
                        $orientation = $exif['IFD0']['Orientation'];
                    } else {
                        $orientation = 0;
                    }
                    $file->orientation = $orientation;

                    if(Helpers::exifDataExists($exif, 'IFD0', 'Copyright')) {
                        $copyright = $exif['IFD0']['Copyright'];
                    } else {
                        $copyright = '';
                    }
                    $file->copyright = $copyright;

                    if(Helpers::exifDataExists($exif, 'IFD0', 'ImageDescription')) {
                        $description = $exif['IFD0']['ImageDescription'];
                    } else {
                        $description = '';
                    }
                    $file->description = $description;

                    if(Helpers::exifDataExists($exif, 'EXIF', 'DateTimeOriginal')) {
                        $dateOrig = strtotime($exif['EXIF']['DateTimeOriginal']);
                        $dateOrig = date('Y-m-d H:i:s', $dateOrig);
                        $file->created = $dateOrig;
                    }
                }
            }
            $file->save();
        }
    }

    public function setContent($fileObject) {
        $filehandle = fopen($fileObject->getRealPath(), 'r');
        Storage::put(
            $this->name,
            $filehandle
        );
        fclose($filehandle);
        $fileUrl = Helpers::getStorageFilePath($this->name);
        $lastModified = date('Y-m-d H:i:s', filemtime($fileUrl));

        $this->modified = $lastModified;
        $this->save();
    }

    public function rename($newName) {
        Storage::move($this->name, $newName);
        $this->name = $newName;
        if($this->isImage()) {
            $nameNoExt = pathinfo($newName, PATHINFO_FILENAME);
            $this->thumb = $nameNoExt . self::THUMB_SUFFIX . self::EXP_SUFFIX;
        }
        $this->save();
    }

    public function link($eid) {
        $link = new ContextFile();
        $link->photo_id = $this->id;
        $link->context_id = $eid;
        $link->lasteditor = 'Admin'; // TODO
        $link->save();
    }

    public function unlink($eid) {
        $link = ContextFile::where('context_id', $eid)
            ->where('photo_id', $this->id)
            ->delete();
    }

    public function setFileInfo() {
        $this->url = Helpers::getFullFilePath($this->name);
        if($this->isImage()) {
            $this->thumb_url = Helpers::getFullFilePath($this->thumb);
        }

        try {
            Storage::get($this->name);
            $this->size = Storage::size($this->name);
            $this->modified_unix = Storage::lastModified($this->name);
        } catch(FileNotFoundException $e) {
        }

        $this->created_unix = strtotime($this->created);
    }

    public function getArchiveFileList() {
        if(!$this->isArchive()) return [];
        $path = Helpers::getStorageFilePath($this->name);
        $archive = UnifiedArchive::open($path);
        $fileList = $this->getContainingFiles($archive->getFileNames(), $archive);

        return self::convertFileListToArray($fileList);
    }

    public function getArchivedFileContent($filepath) {
        $path = Helpers::getStorageFilePath($this->name);
        $archive = UnifiedArchive::open($path);
        return base64_encode($archive->getFileContent($filepath));
    }

    private static function convertFileListToArray($fileList) {
        $newList = array_values($fileList);
        foreach($newList as $k => $entry) {
            if(isset($entry->children)) {
                $entry->children = self::convertFileListToArray($entry->children);
                $newList[$k] = $entry;
            }
        }
        return $newList;
    }

    private function getContainingFiles($files, $archive, $prefix = '') {
        $tree = [];
        $subfolders = [];
        $folders = [];
        foreach($files as $file) {
            $isInSubfolder = false;
            foreach($subfolders as $fkey) {
                if(starts_with($file, $fkey)) {
                    $isInSubfolder = true;
                    $subname = substr($file, strlen($fkey));
                    $folders[$fkey][] = $subname;
                    break;
                }
            }
            if($isInSubfolder) continue;
            $isDirectory = false;
            // check if "file" is folder
            if(ends_with($file, '/')) {
                $isDirectory = true;
                $subfolders[] = $file;
                $folders[$file] = [];
            } else {
                $isDirectory = false;
            }
            $data = $archive->getFileData($prefix.$file);
            $data->is_directory = $isDirectory;
            $data->clean_filename = $file;
            $tree[$file] = $data;
        }
        foreach($folders as $fkey => $subfiles) {
            $tree[$fkey]->children = $this->getContainingFiles($subfiles, $archive, $prefix.$fkey);
        }
        return $tree;
    }

    public function deleteFile() {
        $url = Helpers::getStorageFilePath($this->name);
        Storage::delete($url);
        if(isset($this->thumb)) {
            $thumbUrl = Helpers::getStorageFilePath($this->thumb);
            Storage::delete($thumbUrl);
        }
        $this->delete();
    }

    public static function getCategory($mimes, $extensions, $mimeWildcards = null, $query = null, $or = false) {
        if(!isset($query)) {
            $query = self::WhereIn('mime_type', $mimes);
        } else {
            if($or) $query->orWhereIn('mime_type', $mimes);
            else $query->whereIn('mime_type', $mimes);
        }
        if(isset($mimeWildcards)) {
            foreach($mimeWildcards as $mime) {
                $query->orWhere('mime_type', 'ilike', $mime.'%');
            }
        }

        foreach($extensions as $ext) {
            $query->orWhere('name', 'ilike', '%'.$ext);
        }
        return $query;
    }

    public static function getImages() {
        return self::getCategory([], [], ['image/'])->get();
    }

    public static function addImages($query, $or) {
        return self::getCategory([], [], ['image/'], $query, $or);
    }

    public static function getAudio() {
        return self::getCategory([], [], ['audio/'])->get();
    }

    public static function addAudio($query, $or) {
        return self::getCategory([], [], ['audio/'], $query, $or);
    }

    public static function getVideo() {
        return self::getCategory([], [], ['video/'])->get();
    }

    public static function addVideo($query, $or) {
        return self::getCategory([], [], ['video/'], $query, $or);
    }

    public static function getPdfs() {
        return self::getCategory(['application/pdf'], ['.pdf'])->get();
    }

    public static function addPdfs($query, $or) {
        return self::getCategory(['application/pdf'], ['.pdf'], null, $query, $or);
    }

    public static function getXmls() {
        $mimeTypes = ['application/xml', 'text/xml', 'text/xml-external-parsed-entity'];
        $extensions = ['.xml'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addXmls($query, $or) {
        $mimeTypes = ['application/xml', 'text/xml', 'text/xml-external-parsed-entity'];
        $extensions = ['.xml'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getHtmls() {
        $mimeTypes = ['application/xhtml+xml', 'text/html'];
        $extensions = ['.htm', '.html', '.shtml', '.xhtml'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addHtmls($query, $or) {
        $mimeTypes = ['application/xhtml+xml', 'text/html'];
        $extensions = ['.htm', '.html', '.shtml', '.xhtml'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function get3d() {
        $mimeTypes = ['model/vnd.collada+xml', 'model/gltf-binary', 'model/gltf+json', 'chemical/x-pdb'];
        $extensions = ['.dae', '.obj', '.pdb', '.gltf'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function add3d($query, $or) {
        $mimeTypes = ['model/vnd.collada+xml', 'model/gltf-binary', 'model/gltf+json', 'chemical/x-pdb'];
        $extensions = ['.dae', '.obj', '.pdb', '.gltf'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getDicom() {
        $mimeTypes = ['application/dicom', 'application/dicom+xml'];
        $extensions = ['.dcm', '.dicom'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addDicom($query, $or) {
        $mimeTypes = ['application/dicom', 'application/dicom+xml'];
        $extensions = ['.dcm', '.dicom'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getArchives() {
        $mimeTypes = ['application/gzip', 'application/zip', 'application/x-gtar', 'application/x-tar', 'application/x-ustar', 'application/x-rar-compressed', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z-compressed', 'application/x-compress'];
        $extensions = ['.zip', '.gz', '.gtar', '.tar', '.tgz', '.ustar', '.rar', '.bz', '.bz2', '.xz', '.7z', '.z'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addArchives($query, $or) {
        $mimeTypes = ['application/gzip', 'application/zip', 'application/x-gtar', 'application/x-tar', 'application/x-ustar', 'application/x-rar-compressed', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z-compressed', 'application/x-compress'];
        $extensions = ['.zip', '.gz', '.gtar', '.tar', '.tgz', '.ustar', '.rar', '.bz', '.bz2', '.xz', '.7z', '.z'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getTexts() {
        $mimeTypes = ['application/javascript', 'application/json', 'application/x-latex', 'application/x-tex'];
        $mimeWildcards = ['text/'];
        $extensions = ['.txt', '.md', '.markdown', '.mkd', '.csv', '.json', '.css', '.htm', '.html', '.shtml', '.js', '.rtx', '.rtf', '.tsv', '.xml'];
        return self::getCategory($mimeTypes, $extensions, $mimeWildcards)->get();
    }

    public static function addTexts($query, $or) {
        $mimeTypes = ['application/javascript', 'application/json', 'application/x-latex', 'application/x-tex'];
        $mimeWildcards = ['text/'];
        $extensions = ['.txt', '.md', '.markdown', '.mkd', '.csv', '.json', '.css', '.htm', '.html', '.shtml', '.js', '.rtx', '.rtf', '.tsv', '.xml'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getDocuments() {
        $mimeTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'];
        $extensions = ['.doc', '.docx', '.odt'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addDocuments($query, $or) {
        $mimeTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'];
        $extensions = ['.doc', '.docx', '.odt'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getSpreadsheets() {
        $mimeTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/x-latex', 'application/x-tex'];
        $extensions = ['.xls', '.xlsx', '.ods'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addSpreadsheets($query, $or) {
        $mimeTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/x-latex', 'application/x-tex'];
        $extensions = ['.xls', '.xlsx', '.ods'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public static function getPresentations() {
        $mimeTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation'];
        $extensions = ['.ppt', '.pptx', '.odp'];
        return self::getCategory($mimeTypes, $extensions)->get();
    }

    public static function addPresentations($query, $or) {
        $mimeTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation'];
        $extensions = ['.ppt', '.pptx', '.odp'];
        return self::getCategory($mimeTypes, $extensions, null, $query, $or);
    }

    public function getCategoryAttribute() {
        if($this->isImage()) return 'image';
        if($this->isAudio()) return 'audio';
        if($this->isVideo()) return 'video';
        if($this->isPdf()) return 'pdf';
        if($this->isXml()) return 'xml';
        if($this->isHtml()) return 'html';
        if($this->is3d()) return '3d';
        if($this->isDicom()) return 'dicom';
        if($this->isArchive()) return 'archive';
        if($this->isText()) return 'text';
        if($this->isDocument()) return 'document';
        if($this->isSpreadsheet()) return 'spreadsheet';
        if($this->isPresentation()) return 'presentation';
        return 'undefined';
    }

    public static function getCategories() {
        return [
            ['key' => 'image', 'label' => 'Image'],
            ['key' => 'audio', 'label' => 'Audio File'],
            ['key' => 'video', 'label' => 'Video File'],
            ['key' => 'pdf', 'label' => 'PDF'],
            ['key' => 'xml', 'label' => 'XML'],
            ['key' => 'html', 'label' => 'HTML'],
            ['key' => '3d', 'label' => '3D File'],
            ['key' => 'dicom', 'label' => 'DICOM File'],
            ['key' => 'archive', 'label' => 'Archive'],
            ['key' => 'text', 'label' => 'Text File'],
            ['key' => 'document', 'label' => 'Office Documents'],
            ['key' => 'spreadsheet', 'label' => 'Spreadsheets'],
            ['key' => 'presentation', 'label' => 'Presentation Files'],
        ];
    }

    public function asHtml() {
        if(!$this->isDocument() && !$this->isSpreadsheet() && !$this->isPresentation()) {
            return [
                'error' => 'HTML not supported for file type ' . $this->mime_type
            ];
        }
        $tempFile = tempnam(sys_get_temp_dir(), 'Spacialist_html_');

        if($this->isDocument()) {
            $phpWord = \PhpOffice\PhpWord\IOFactory::load(Helpers::getStorageFilePath($this->name));
            $writer = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'HTML');
            $writer->save($tempFile);
        } else if($this->isSpreadsheet()) {
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load(Helpers::getStorageFilePath($this->name));
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Html($spreadsheet);
            $writer->save($tempFile);
        } else  if($this->isPresentation()) {
            return ['error' => 'Presentations not yet supported!'];
        }
        $content = file_get_contents($tempFile);
        unlink($tempFile);
        return $content;
    }

    public function linkCount() {
        return ContextFile::where('photo_id', $this->id)->count();
    }

    public function getExifAttribute() {
        return $this->getExifData();
    }

    public function contexts() {
        return $this->belongsToMany('App\Context', 'context_photos', 'photo_id', 'context_id');
    }

    //TODO: this relationship is not working right now due to not referencing the id on ThConcept
    // as soon as id's are referenced this needs to be fixed
    public function tags() {
        return $this->belongsToMany('App\ThConcept', 'photo_tags', 'photo_id', 'concept_url');
    }

    private function extractFromIfd($ifd, &$values) {
        foreach($ifd->getEntries() as $entry) {
            $name = PelTag::getName($entry->getIfdType(), $entry->getTag());
            if($entry->getIfdType() !== PelIfd::IFD0 && $entry->getIfdType() !== PelIfd::IFD1) {
                $key = PelIfd::getTypeName($entry->getIfdType());
                if(!isset($values[$key])) {
                    $values[$key] = [];
                }
                $values[$key][$name] = $entry->getText();
            } else {
                $values[$name] = $entry->getText();
            }
        }
        foreach($ifd->getSubIfds() as $sifd) {
            $this->extractFromIfd($sifd, $values);
        }
        if(!$ifd->isLastIfd()) {
            $this->extractFromIfd($ifd->getNextIfd(), $values);
        }
    }

    private function getExifData() {
        if(!$this->isImage()) return null;
        try {
            $content = Storage::get($this->name);
            $data = new PelDataWindow($content);
        } catch(FileNotFoundException $e) {
            return null;
        } catch(PelDataWindowOffsetException $e) {
            return null;
        }
        try {
            PelJpeg::isValid($data);
            $jpg = new PelJpeg();
            $jpg->load($data);
            $app1 = $jpg->getExif();
            if($app1 == null) {
                return null;
            }
            $ifd = $app1->getTiff()->getIfd();
            $values = [];
            $this->extractFromIfd($ifd, $values);
            return $values;
        } catch(PelDataWindowOffsetException $e) {
            return null;
        } catch(PelJpegInvalidMarkerException $e) {
            return null;
        }
        try {
            PelTiff::isValid($data);
        } catch(PelDataWindowOffsetException $e) {
            return null;
        }
        return null;
    }

    public function isImage() {
        return starts_with($this->mime_type, 'image/');
    }

    public function isAudio() {
        return starts_with($this->mime_type, 'audio/');
    }

    public function isVideo() {
        return starts_with($this->mime_type, 'video/');
    }

    public function isPdf() {
        return $this->mime_type == 'application/pdf' ||
            ends_with($this->name, '.pdf');
    }

    public function isXml() {
        return in_array($this->mime_type, ['application/xml', 'text/xml', 'text/xml-external-parsed-entity']) ||
            ends_with($this->name, '.xml');
    }

    public function isHtml() {
        $mimeTypes = ['application/xhtml+xml', 'text/html'];
        $extensions = ['.htm', '.html', '.shtml', '.xhtml'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function is3d() {
        $is = false;
        $mimeTypes = ['model/vnd.collada+xml', 'model/gltf-binary', 'model/gltf+json'];
        $extensions = ['.dae', '.obj', '.pdb', '.gltf'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function isDicom() {
        $is = false;
        $mimeTypes = ['application/dicom', 'application/dicom+xml'];
        $extensions = ['.dcm', '.dicom'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function isArchive() {
        $mimeTypes = ['application/gzip', 'application/zip', 'application/x-gtar', 'application/x-tar', 'application/x-ustar', 'application/x-rar-compressed', 'application/x-bzip', 'application/x-bzip2', 'application/x-7z-compressed', 'application/x-compress'];
        $extensions = ['.zip', '.gz', '.gtar', '.tar', '.tgz', '.ustar', '.rar', '.bz', '.bz2', '.xz', '.7z', '.z'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function isText() {
        $mimeTypes = ['application/javascript', 'application/json', 'application/x-latex', 'application/x-tex', 'text/comma-separated-values', 'text/csv', 'text/x-markdown', 'text/markdown'];
        $extensions = ['.txt', '.md', '.markdown', '.mkd', '.csv', '.json', '.css', '.htm', '.html', '.shtml', '.js', '.rtx', '.rtf', '.tsv', '.xml'];
        $is = starts_with($this->mime_type, 'text/');
        if($is) return true;
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function isDocument() {
        $mimeTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.oasis.opendocument.text'];
        $extensions = ['.doc', '.docx', '.odt'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function isSpreadsheet() {
        $mimeTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/x-latex', 'application/x-tex'];
        $extensions = ['.xls', '.xlsx', '.ods'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }

    public function isPresentation() {
        $mimeTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.oasis.opendocument.presentation'];
        $extensions = ['.ppt', '.pptx', '.odp'];
        $is = in_array($this->mime_type, $mimeTypes);
        if($is) return true;
        foreach($extensions as $ext) {
            if(ends_with($this->name, $ext)) {
                $is = true;
                break;
            }
        }
        return $is;
    }
}
