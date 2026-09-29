# Folder Tab around a Form

Use the region's icon for the tab (a folder, document or record icon reads best).

```apexlang
region customer-file (
    name: Customer file
    type: form
    appearance {
        template: @amc-folder-tab
        templateOptions: [
            #DEFAULT#
            amc-TFolderTab--stacked
        ]
        icon: fa-folder-open-o
    }
)
```

The template reference (`@amc-folder-tab`) and the theme-template folder layout are not yet
confirmed by the APEXlang compiler; check with apexlang's compiler-truth audit.
