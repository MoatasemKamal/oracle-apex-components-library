# Command Rail as the application Navigation Menu

Set the template on the application's side navigation menu in `application.apx`
(User Interface > Navigation Menu). The navigation list keeps one level of sub entries;
Attribute 1 holds extra search keywords and Attribute 2 a badge such as a count.

```apexlang
navigationMenu {
    listTemplate: @amc-command-rail
    templateOptions: [
        #DEFAULT#
    ]
    list: @navigation-menu
}
```

With options, for example a compact dark rail that starts as icons on first use:

```apexlang
navigationMenu {
    listTemplate: @amc-command-rail
    templateOptions: [
        #DEFAULT#
        amc-TCommandRail--compact
        amc-TCommandRail--dark
        amc-TCommandRail--startCollapsed
    ]
    list: @navigation-menu
}
```

List entries of the navigation list, as in the preview:

| Entry | Parent | Icon | Attribute 1, search keywords | Attribute 2, badge |
|---|---|---|---|---|
| Dashboard | | fa-dashboard | home overview kpi | |
| Sales | | fa-line-chart | | |
| Orders | Sales | | sales orders purchase po | 128 |
| Finance | | fa-bank | | 14 |
| Invoices | Finance | | billing bills receivables ar | 14 |
| Administration, target empty so it only opens its group | | fa-cog | | |

The `navigationMenu` block and the `@amc-command-rail` reference follow the pattern in
references/theme-templates.md but are not yet confirmed by the APEXlang compiler; check with
apexlang's compiler-truth audit or a real import. Universal Theme's side navigation slot and
collapse classes are also unconfirmed; see the template help text.
