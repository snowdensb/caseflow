# frozen_string_literal: true

class ExportController < ApplicationController
  def show
    return render_access_error unless current_user.admin?

    no_cache

    # https://chodounsky.com/2015/01/26/respond-to-different-formats-in-rails-controller/
    respond_to do |format|
      format.html { render layout: "plain_application" }
      format.text { render plain:  export_as_text }
      format.json { render json: sanitized_json }
    end
  end

  private

  helper_method :appeal,
                :show_pii_query_param, :treee_fields,
                :treee_help_text,
                :task_tree_as_text, :intake_as_text

  def export_as_text
    [
      task_tree_as_text,
      intake_as_text
    ].join("\n\n")
  end

  def treee_help_text
    @treee_help_text ||= "Common fields for task tree: \n" +
                         (Task.column_names + TaskTreeRenderModule::PRESET_VALUE_FUNCS.keys).map(&:to_s).join(", ")
  end

  def task_tree_as_text
    [appeal.tree(*treee_fields),
     legacy_task_tree_as_text].compact.join("\n\n")
  end

  DEFAULT_TREEE_FIELDS = [:id, :status, :ASGN_BY, :ASGN_TO, :ASGN_DATE, :UPD_DATE, :CRE_DATE, :CLO_DATE].freeze

  def treee_fields
    return DEFAULT_TREEE_FIELDS unless fields_query_param

    fields_query_param.split(",").map(&:strip).map(&:to_sym)
  end

  def legacy_task_tree_as_text
    return nil unless legacy_appeal?

    [legacy_tasks_as_text,
     appeal.location_history.map(&:summary)]
  end

  # :reek:FeatureEnvy
  def legacy_tasks_as_text
    return nil unless legacy_appeal?

    tasks = LegacyWorkQueue.tasks_by_appeal_id(appeal.vacols_id)
    tasks.map do |task|
      "#{task.class.name}, "\
      "\n  assigned_by: #{task.assigned_by&.inspect} #{task.assigned_by&.sdomainid}, "\
      "\n  assigned_to: #{task.assigned_to&.inspect} #{task.assigned_to&.sdomainid}, "\
      "\n  at: #{task.assigned_at}\n"
    rescue StandardError
      "#{task.class.name}, "\
        "\n  assigned_by: #{task.assigned_by&.inspect}, "\
        "\n  assigned_to: #{task.assigned_to&.inspect}, "\
        "\n  at: #{task.assigned_at}\n"
    end.join("\n")
  end

  def intake_as_text
    IntakeRenderer.render(appeal, show_pii: show_pii_query_param)
  end

  def sanitized_json
    return "(LegacyAppeals are not yet supported)".to_json if legacy_appeal?

    sje = SanitizedJsonExporter.new(appeal, sanitize: !show_pii_query_param, verbosity: 0)
    sje.file_contents
  end

  def legacy_appeal?
    appeal.is_a?(LegacyAppeal)
  end

  def appeal
    @appeal ||= fetch_appeal
  end

  def fetch_appeal
    if Appeal::UUID_REGEX.match?(appeal_id)
      Appeal.find_by(uuid: appeal_id)
    else
      LegacyAppeal.find_by_vacols_id(appeal_id)
    end
  end

  def appeal_id
    params[:appeal_id]
  end

  def show_pii_query_param
    request.query_parameters.key?("show_pii")
  end

  def fields_query_param
    request.query_parameters["fields"]
  end

  def render_access_error
    render(Caseflow::Error::ActionForbiddenError.new(
      message: COPY::ACCESS_DENIED_TITLE
    ).serialize_response)
  end
end
