class DetailsIssueHooks < Redmine::Hook::ViewListener
  def protect_against_forgery?
    false
  end

  def current_is_detail_page(context)
    # check if we see an issue but not creating a new one or on the specific edit page
    ret = context[:controller] && context[:controller].is_a?(IssuesController) && context[:request].original_url.rindex(/\/issues\/\S+/) && !context[:request].original_url.rindex(/\/issues\/new/) && !context[:request].original_url.rindex(/\/issues\/\d+\/edit/)
  end

  def view_layouts_base_html_head(context)
    return unless current_is_detail_page(context)

    if User.current.allowed_to?(:edit_issues, context[:project])
      stylesheet_link_tag('issue_dynamic_edit.css', :plugin => :redmine_issue_dynamic_edit)
    end
  end

  def view_layouts_base_body_bottom(context)
    return unless current_is_detail_page(context)

    if User.current.allowed_to?(:edit_issues, context[:project])
      # Inject plugin settings as safe window._CONF_* variables so client-side
      # scripts can read configured values without redeclaration issues.
      settings = Setting.plugin_redmine_issue_dynamic_edit || {}
      force_https = settings['force_https'].to_s == '1' || settings['force_https'].to_s == 'true'
      display = settings['display_edit_icon'] || 'single'
      l_type_value = settings['listener_type_value'] || 'click'
      l_type_icon = settings['listener_type_icon'] || 'click'
      l_target = settings['listener_target'] || 'value'
      excluded_raw = settings['excluded_field_id'].to_s
      excluded_array = excluded_raw.split(',').map(&:strip).reject(&:empty?)
      check_conflict = settings['check_issue_update_conflict'].to_s == '1' || settings['check_issue_update_conflict'].to_s == 'true'

      config = {
        force_https: force_https,
        display_edit_icon: display,
        listener_type_value: l_type_value,
        listener_type_icon: l_type_icon,
        listener_target: l_target,
        excluded_field_id: excluded_array,
        check_issue_update_conflict: check_conflict,
        issue_id: get_issue_id(context),
        project_id: context[:project]&.id,
        conflict_title: l(:ide_txt_notice_conflict_title),
        conflict_txt: l(:ide_txt_notice_conflict_text),
        conflict_link: l(:ide_txt_notice_conflict_link),
        refresh_button_text: l(:ide_txt_button_refresh),
        comments_in_reverse_order: User.current.wants_comments_in_reverse_order?
      }

      html = javascript_tag("window.issueDynamicEditConfig = #{config.to_json};") 
      html += stylesheet_link_tag('issue_dynamic_edit.css', :plugin => :redmine_issue_dynamic_edit, media: 'all')
      html += javascript_include_tag('issue_dynamic_edit.js', :plugin => :redmine_issue_dynamic_edit)

      html.html_safe
    end
  end

  private

  def get_issue_id(context)
    issue = context[:issue]
    return issue.id unless issue.nil?

    controller = context[:controller]
    return nil unless controller.is_a?(IssuesController)

    issue = controller.instance_variable_get(:@issue)

    return issue&.id
  end
end
