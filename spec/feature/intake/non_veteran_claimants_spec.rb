# frozen_string_literal: true

## This feature spec covers non-veteran claimants for Appeals when they are not listed in the veteran's relationships

feature "Non-veteran claimants", :postgres do
  include IntakeHelpers

  before do
    setup_intake_flags
  end

  let(:veteran_file_number) { "123412345" }
  let(:veteran) do
    Generators::Veteran.build(file_number: veteran_file_number, first_name: "Ed", last_name: "Merica")
  end
  let(:benefit_type) { "compensation" }

  let(:new_individual_claimant) do
    {
      first_name: "Michelle",
      last_name: "McClaimant",
      address1: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zip: "94123",
      country: "United States",
      email: "claimant@example.com"
    }
  end

  let(:decision_date) { 3.months.ago.mdY }

  context "with non_veteran_claimants feature toggle" do
    before { FeatureToggle.enable!(:non_veteran_claimants) }
    after { FeatureToggle.disable!(:non_veteran_claimants) }

    let(:attorneys) do
      Array.new(15) { create(:bgs_attorney) }
    end

    let(:attorney) { attorneys.last }

    it "allows selecting claimant not listed" do
      start_appeal(veteran)
      visit "/intake"

      expect(page).to have_current_path("/intake/review_request")

      within_fieldset("Is the claimant someone other than the Veteran?") do
        find("label", text: "Yes", match: :prefer_exact).click
      end

      expect(page).to have_selector("label[for=claimant-options_claimant_not_listed]")

      within_fieldset(COPY::SELECT_CLAIMANT_LABEL) do
        find("label", text: "Claimant not listed", match: :prefer_exact).click
      end

      click_intake_continue

      expect(page).to have_current_path("/intake/add_claimant")
      expect(page).to have_content("Add Claimant")

      fill_in("Relationship to the Veteran", with: "Attorney (previously or currently)").send_keys :enter
      add_existing_attorney(attorney)

      expect(page).to have_content("Claimant's address")
      expect(page).to have_content(attorney.name)
      expect(page).to have_content(attorney.address_line_1.titleize)

      expect(page).to have_button("Continue to next step", disabled: false)

      # Verify that this can be removed
      find(".cf-select__clear-indicator").click
      expect(page).to_not have_content(attorney.name)
      expect(page).to_not have_content("Claimant's address")
      expect(page).to have_button("Continue to next step", disabled: true)
      expect(page).to have_content("Type to search...")

      safe_click ".dropdown-listedAttorney"
      fill_in("Claimant's name", with: "Name not lis")
      expect(page).to have_content("Name not listed")
      find("div", class: "cf-select__menu", text: "Name not listed")
      select_claimant(0)

      expect(page).to have_content("Is the claimant an organization or individual?")

      # Check validation for unlisted attorney
      within_fieldset("Is the claimant an organization or individual?") do
        find("label", text: "Organization", match: :prefer_exact).click
      end
      fill_in "Organization name", with: "Attorney's Law Firm"
      fill_in "Street address 1", with: "1234 Justice St."
      fill_in "City", with: "Anytown"
      fill_in("State", with: "California").send_keys :enter
      fill_in("Zip", with: "12345").send_keys :enter
      fill_in("Country", with: "United States").send_keys :enter

      expect(page).to have_button("Continue to next step", disabled: false)

      click_button "Continue to next step"
      submit_confirmation_modal

      # Submission currently out of scope; consider stub as next path might be conditional
      expect(page).to have_current_path("/intake/add_issues")
    end

    it "allows selecting claimant not listed goes to and add_power_of_attorney path" do
      start_appeal(veteran)
      visit "/intake"

      expect(page).to have_current_path("/intake/review_request")

      within_fieldset("Is the claimant someone other than the Veteran?") do
        find("label", text: "Yes", match: :prefer_exact).click
      end

      expect(page).to have_selector("label[for=claimant-options_claimant_not_listed]")

      within_fieldset(COPY::SELECT_CLAIMANT_LABEL) do
        find("label", text: "Claimant not listed", match: :prefer_exact).click
      end

      click_intake_continue

      expect(page).to have_current_path("/intake/add_claimant")
      expect(page).to have_content("Add Claimant")

      fill_in("Relationship to the Veteran", with: "Other").send_keys :enter

      expect(page).to have_content("Is the claimant an organization or individual?")

      within_fieldset("Is the claimant an organization or individual?") do
        find("label", text: "Individual", match: :prefer_exact).click
      end
      expect(page).to have_button("Continue to next step", disabled: true)

      # fill in form information
      add_new_claimant

      within_fieldset("Do you have a VA Form 21-22 for this claimant?") do
        find("label", text: "Yes", match: :prefer_exact).click
      end

      expect(page).to have_button("Continue to next step", disabled: false)
      click_button "Continue to next step"
      expect(page).to have_current_path("/intake/add_power_of_attorney")
      expect(page).to have_content("Add Claimant's POA")

      # add poa
      add_existing_poa(attorney)
      expect(page).to have_content("Representative's address")
      find(".cf-select__clear-indicator").click

      expect(page).to_not have_content(attorney.name)
      expect(page).to_not have_content("Representative's address")
      expect(page).to have_content("Type to search...")

      # Fill in Name not listed
      safe_click ".dropdown-listedAttorney"
      fill_in("Representative's name", with: "Name not lis")
      expect(page).to have_content("Name not listed")
      find("div", class: "cf-select__menu", text: "Name not listed")
      select_claimant(0)

      expect(page).to have_content("Is the representative an organization or individual?")

      # Check validation for unlisted attorney
      within_fieldset("Is the representative an organization or individual?") do
        find("label", text: "Organization", match: :prefer_exact).click
      end

      add_new_poa

      expect(page).to have_button("Continue to next step", disabled: false)

      click_button "Continue to next step"

      submit_confirmation_modal

      # Submission currently out of scope; consider stub as next path might be conditional
      expect(page).to have_current_path("/intake/add_issues")
      expect(page).to have_content("Claimant's POA")
      expect(page).to have_content(new_individual_claimant[:first_name])

      # Add request issues
      click_intake_add_issue
      add_intake_nonrating_issue(date: decision_date)
      expect(page).to have_content("Active Duty Adjustments")
      click_intake_finish
      expect(page).to have_current_path("/intake/completed")

      # verify that current intake with claimant_type other was created
      expect(Intake.last.detail.claimant_type).to eq("other")
      claimant = Claimant.find_by(type: "OtherClaimant")
      expect(claimant.power_of_attorney.name).to eq("Attorney's Law Firm")
      appeal = Appeal.find_by(docket_type: "evidence_submission")

      # Case details page
      visit "queue/appeals/#{appeal.uuid}"
      expect(page).to have_current_path("/queue/appeals/#{appeal.uuid}")
      expect(page).to have_content(new_individual_claimant[:first_name])
      expect(claimant.relationship).to eq("Other")
    end

    it "allows selecting claimant not listed and validates spouse is saved on review page" do
      start_appeal(veteran)
      visit "/intake"

      expect(page).to have_current_path("/intake/review_request")

      within_fieldset("Is the claimant someone other than the Veteran?") do
        find("label", text: "Yes", match: :prefer_exact).click
      end

      expect(page).to have_selector("label[for=claimant-options_claimant_not_listed]")

      within_fieldset(COPY::SELECT_CLAIMANT_LABEL) do
        find("label", text: "Claimant not listed", match: :prefer_exact).click
      end

      click_intake_continue

      expect(page).to have_current_path("/intake/add_claimant")
      expect(page).to have_content("Add Claimant")

      fill_in("Relationship to the Veteran", with: "Spouse").send_keys :enter

      # fill in form information
      fill_in "First name", with: "Darlyn"
      fill_in "Last name", with: "Duck"
      fill_in "Street address 1", with: "1234 Justice St."
      fill_in "City", with: "Anytown"
      fill_in("State", with: "California").send_keys :enter
      fill_in("Zip", with: "12345").send_keys :enter
      fill_in("Country", with: "United States").send_keys :enter
      within_fieldset("Do you have a VA Form 21-22 for this claimant?") do
        find("label", text: "No", match: :prefer_exact).click
      end

      expect(page).to have_button("Continue to next step", disabled: false)

      click_button "Continue to next step"

      expect(page).to have_content("Darlyn Duck")

      submit_confirmation_modal

      claimant = Claimant.find_by(type: "OtherClaimant")

      expect(claimant.name).to eq("Darlyn Duck")
      expect(claimant.relationship).to eq("Spouse")

      expect(page).to have_content(COPY::ADD_CLAIMANT_CONFIRM_MODAL_NO_POA)

      # Add request issues
      click_intake_add_issue
      add_intake_nonrating_issue(date: decision_date)
      expect(page).to have_content("Active Duty Adjustments")
      click_intake_finish
      expect(page).to have_current_path("/intake/completed")

      appeal = Appeal.find_by(docket_type: "evidence_submission")
      # Case details page
      visit "queue/appeals/#{appeal.uuid}"
      expect(page).to have_current_path("/queue/appeals/#{appeal.uuid}")
      expect(claimant.name).to eq("Darlyn Duck")
      expect(claimant.relationship).to eq("Spouse")
    end
  end

  def add_existing_attorney(attorney)
    fill_in "Claimant's name", with: attorney.name
    select_claimant(0)
  end

  def add_existing_poa(attorney)
    fill_in "Representative's name", with: attorney.name
    select_claimant(0)
  end

  def add_new_claimant
    fill_in "First name", with: new_individual_claimant[:first_name]
    fill_in "Last name", with: new_individual_claimant[:last_name]
    fill_in "Street address 1", with: new_individual_claimant[:address1]
    fill_in "City", with: new_individual_claimant[:city]
    fill_in("State", with: new_individual_claimant[:state]).send_keys :enter
    fill_in("Zip", with: new_individual_claimant[:zip]).send_keys :enter
    fill_in("Country", with: new_individual_claimant[:country]).send_keys :enter
    fill_in "Claimant email", with: new_individual_claimant[:email]
  end

  def add_new_poa
    fill_in "Organization name", with: "Attorney's Law Firm"
    fill_in "Street address 1", with: "1234 Justice St."
    fill_in "City", with: "Anytown"
    fill_in("State", with: "California").send_keys :enter
    fill_in("Zip", with: "12345").send_keys :enter
    fill_in("Country", with: "United States").send_keys :enter
  end

  def select_claimant(index = 0)
    click_dropdown({ index: index }, find(".dropdown-listedAttorney"))
  end

  def submit_confirmation_modal
    # Ensure it is showing
    expect(page).to have_content(COPY::ADD_CLAIMANT_CONFIRM_MODAL_TITLE)

    click_button "Confirm"

    expect(page).to_not have_content(COPY::ADD_CLAIMANT_CONFIRM_MODAL_TITLE)
  end
end
