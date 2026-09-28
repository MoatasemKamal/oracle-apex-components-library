procedure render (
    p_item   in            apex_plugin.t_item,
    p_plugin in            apex_plugin.t_plugin,
    p_param  in            apex_plugin.t_item_render_param,
    p_result in out nocopy apex_plugin.t_item_render_result )
is
    l_max         pls_integer;
    l_icon        varchar2(255) := nvl( p_item.attribute_02, 'fa-star' );
    l_clearable   boolean       := nvl( p_item.attribute_03, 'Y' ) = 'Y';
    l_clear_label varchar2(255) := nvl( p_item.attribute_04, 'Clear rating' );
    l_value       pls_integer;
    l_id          varchar2(255) := apex_escape.html_attribute( p_item.name );
    l_name        varchar2(255);
begin
    begin
        l_max := least( greatest( nvl( to_number( p_item.attribute_01 ), 5 ), 1 ), 10 );
    exception
        when value_error then
            l_max := 5;
    end;

    begin
        l_value := round( to_number( p_param.value ) );
    exception
        when value_error then
            l_value := null;
    end;

    if p_param.is_readonly or p_param.is_printer_friendly then
        apex_plugin_util.print_hidden_if_readonly (
            p_item_name           => p_item.name,
            p_value               => p_param.value,
            p_is_readonly         => p_param.is_readonly,
            p_is_printer_friendly => p_param.is_printer_friendly );

        sys.htp.p(
            '<span id="' || l_id || '_DISPLAY" class="amc-Rating amc-Rating--readonly" role="img" aria-label="'
            || apex_escape.html_attribute( nvl( to_char( l_value ), '0' ) || ' / ' || l_max ) || '">' );
        for i in 1 .. l_max loop
            sys.htp.p(
                '<span class="amc-Rating-star' || case when i <= nvl( l_value, 0 ) then ' is-on' end
                || '" aria-hidden="true"><span class="fa ' || apex_escape.html_attribute( l_icon ) || '"></span></span>' );
        end loop;
        sys.htp.p( '</span>' );
        return;
    end if;

    l_name := apex_plugin.get_input_name_for_item;

    sys.htp.p(
        '<fieldset id="' || l_id || '" class="amc-Rating'
        || case when p_item.element_css_classes is not null
                then ' ' || apex_escape.html_attribute( p_item.element_css_classes ) end
        || '" aria-labelledby="' || l_id || '_LABEL">' );

    for i in 1 .. l_max loop
        sys.htp.p(
            '<input type="radio" class="amc-Rating-input" id="' || l_id || '_' || i || '"'
            || ' name="' || apex_escape.html_attribute( l_name ) || '" value="' || i || '"'
            || case when i = l_value then ' checked' end || '>'
            || '<label class="amc-Rating-star' || case when i <= nvl( l_value, 0 ) then ' is-on' end
            || '" for="' || l_id || '_' || i || '">'
            || '<span class="fa ' || apex_escape.html_attribute( l_icon ) || '" aria-hidden="true"></span>'
            || '<span class="amc-u-srOnly">' || i || ' / ' || l_max || '</span>'
            || '</label>' );
    end loop;

    if l_clearable then
        sys.htp.p(
            '<button type="button" class="amc-Rating-clear" title="' || apex_escape.html_attribute( l_clear_label )
            || '" aria-label="' || apex_escape.html_attribute( l_clear_label ) || '">'
            || '<span class="fa fa-times-circle-o" aria-hidden="true"></span></button>' );
    end if;

    sys.htp.p( '</fieldset>' );

    apex_javascript.add_onload_code(
        p_code => 'amc.starRating.init(' || apex_javascript.add_value( p_item.name, false ) || ');' );

    p_result.is_navigable := true;
end render;
