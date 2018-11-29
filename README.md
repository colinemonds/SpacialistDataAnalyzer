# Spacialist Data Analyzer

Spacialist Data Analyzer is a web application that allows users to analyze data in any of their [Spacialist](https://github.com/eScienceCenter/Spacialist) databases.

## Prerequisites
* Spacialist v0.6 running on your server with at least one database (see [Spacialist installation instructions](https://github.com/eScienceCenter/Spacialist/blob/master/INSTALL.md))
* PHP with extension `PDO_PGSQL` enabled
* Configure your web server to serve `index.php` as a directory index, e.g. in Apache: `DirectoryIndex index.php`

## Installation
* Clone this repository into any folder served by your web server. The target folder is hereafter referred to as the app folder
* Run `npm install` and `composer install` in the app folder
* In the app folder, create a `global.ini` file with an entry `spacialist_root` that reflects the absolute local filesystem location of the parent folder of your Spacialist instances, and an entry `spacialist_webroot` pointing to its external URL. For example:
    ```
    spacialist_root=/var/www/spacialist
    spacialist_webroot=https://my.spacialist-server.com/spacialist
    ```

## Usage
Direct your browser to the URL of the app folder and provide an parameter `env` that reflects the name of the folder of the Spacialist instance relative to the `spacialist_root` setting defined in `global.ini`.

For instance, if the Spacialist Data Analyzer app is in the folder `data-analyzer`, and you would like to use the app with the Spacialist instance in the folder `test`, then the target URL would be `https://my.spacialist-server.com/spacialist/data-analyzer/?env=test`

If successful, the browser should display a login page.

## Screenshot

The screenshot below shows the Spacialist Data Analyzer main window, offering a hierarchical view of the **structure of data** in the database (tree on the left), various **analysis options** (right-top pane, allowing selecting what kind of data to display, filtering based on entity properties, as well as grouping with and aggregation of property values), and various kinds of **result displays** including geomaps and tabular data (right-bottom pane).

![scr_main]

## Acknowledgments

Development of Spacialist Data Analyzer was co-funded by the Ministry of Science, Research and the Arts Baden-Württemberg in the "E-Science" funding programme.

[scr_main]: https://eScienceCenter.github.io/assets/SpacialistDataAnalyzer/screenshots/main-window.png "Spacialist Data Analyzer"
