# Next Gallery: site inspection photos from BLOB columns (APEXlang)

A report-mode gallery of inspection photos stored as BLOBs. Each row of
`site_photos` is one image. `apex_util.get_blob_file_src` turns the BLOB into a URL
through a File Browse or Display Image page item (`P10_PHOTO` below, whose source is the
`photo` column of `site_photos` with `photo_id` as the primary key). Width and height are
captured at upload so the layout is stable before the images load. Change `style` to any
of: masonry, justified, filmstrip, coverflow, polaroid, mosaic, hoverZoom, compare,
stackSwipe, lightTable.

```apexlang
region site_photos (
    name: Site Photos
    type: plugin/nextGallery
    layout {
        sequence: 10
        slot: body
    }
    appearance {
        template: @/standard
        templateOptions: [
            #DEFAULT#
        ]
    }
    componentAppearance {
        display: report
    }
    source {
        location: localDatabase
        type: sqlQuery
        sqlQuery:
            ```sql
            select apex_util.get_blob_file_src(
                       p_item_name           => 'P10_PHOTO',
                       p_v1                  => p.photo_id,
                       p_content_disposition => 'inline')             as image_url,
                   case when p.thumbnail is not null then
                       apex_util.get_blob_file_src(
                           p_item_name => 'P10_THUMBNAIL',
                           p_v1        => p.photo_id)
                   end                                                 as thumb_url,
                   p.title,
                   s.site_name || ' · ' ||
                   to_char(p.taken_on, 'DD Mon YYYY')                  as caption,
                   p.alt_text,
                   apex_page.get_url(p_page   => 20,
                                     p_items  => 'P20_PHOTO_ID',
                                     p_values => p.photo_id)           as link_url,
                   p.photo_width                                       as width,
                   p.photo_height                                      as height,
                   p.compare_group                                     as photo_group
              from site_photos p
              join sites s on s.site_id = p.site_id
             where p.site_id = :P10_SITE_ID
             order by p.compare_group nulls last, p.phase_seq, p.taken_on desc
            ```
    }
    settings {
        style: justified
        imageUrl: IMAGE_URL
        thumbnailUrl: THUMB_URL
        title: TITLE
        caption: CAPTION
        altText: ALT_TEXT
        linkUrl: LINK_URL
        width: WIDTH
        height: HEIGHT
        group: PHOTO_GROUP
        columns: auto
        rowHeight: medium
        lightbox: true
        autoplay: false
        galleryLabel: Site inspection photos
    }
    column IMAGE_URL (
        layout {
            sequence: 10
        }
        source {
            type: databaseColumn
            databaseColumn: IMAGE_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column THUMB_URL (
        layout {
            sequence: 20
        }
        source {
            type: databaseColumn
            databaseColumn: THUMB_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column TITLE (
        layout {
            sequence: 30
        }
        source {
            type: databaseColumn
            databaseColumn: TITLE
            dataType: varchar2
            primaryKey: false
        }
    )
    column CAPTION (
        layout {
            sequence: 40
        }
        source {
            type: databaseColumn
            databaseColumn: CAPTION
            dataType: varchar2
            primaryKey: false
        }
    )
    column ALT_TEXT (
        layout {
            sequence: 50
        }
        source {
            type: databaseColumn
            databaseColumn: ALT_TEXT
            dataType: varchar2
            primaryKey: false
        }
    )
    column LINK_URL (
        layout {
            sequence: 60
        }
        source {
            type: databaseColumn
            databaseColumn: LINK_URL
            dataType: varchar2
            primaryKey: false
        }
    )
    column WIDTH (
        layout {
            sequence: 70
        }
        source {
            type: databaseColumn
            databaseColumn: WIDTH
            dataType: number
            primaryKey: false
        }
    )
    column HEIGHT (
        layout {
            sequence: 80
        }
        source {
            type: databaseColumn
            databaseColumn: HEIGHT
            dataType: number
            primaryKey: false
        }
    )
    column PHOTO_GROUP (
        layout {
            sequence: 90
        }
        source {
            type: databaseColumn
            databaseColumn: PHOTO_GROUP
            dataType: varchar2
            primaryKey: false
        }
    )
)
```

Notes

- `apex_util.get_blob_file_src` needs a page item of type File Browse (storage: BLOB
  column specified in item source) or Display Image on the same page whose source
  names the BLOB column, the MIME type column and the primary key column. For Object
  Storage or a REST source, return the object URL (or a pre-authenticated request URL)
  as `image_url` instead.
- Store `photo_width` and `photo_height` at upload (read them in the browser before
  the upload, or from the image header in PL/SQL). Without them the gallery reads the proportions after each image loads, so Masonry,
  Justified and Mosaic may shift once.
- Compare style: give the before and after photos of one location the same
  `compare_group` and order them before-first (`phase_seq`).
- Autoplay applies to filmstrip, coverflow and stackSwipe only; it shows a Pause
  button and never runs when the user prefers reduced motion.
- Use APEX pagination (for example 24 rows per page) for large albums; every image is
  `loading="lazy"`, and the lightbox only loads the full image and its two neighbours.
