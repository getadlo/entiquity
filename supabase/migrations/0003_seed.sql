-- entiquity — demo seed data
-- After signing up in the app, run:  select public.seed_demo_data(auth.uid());
-- (or pass your user id explicitly). Creates a demo firm with 10 entities,
-- people, ownership, tasks, documents metadata, resolutions, and audit history.

create or replace function public.seed_demo_data(p_user uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  e_acme uuid; e_acme_ops uuid; e_acme_ip uuid; e_bluepine uuid; e_harbor uuid;
  e_copper uuid; e_northloop uuid; e_stella uuid; e_grove uuid; e_kestrel uuid;
begin
  insert into organizations (name, billing_email, address)
  values ('Whitfield & Marsh LLP', 'billing@whitfieldmarsh.example', '1180 Peachtree St NE, Suite 2400, Atlanta, GA 30309')
  returning id into v_org;

  insert into memberships (organization_id, user_id, role) values (v_org, p_user, 'owner');
  insert into billing_subscriptions (organization_id, plan_id, status)
  values (v_org, 'professional', 'trialing');

  -- Entities -----------------------------------------------------------------
  insert into entities (organization_id, legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter, tags, created_by)
  values
    (v_org,'Acme Holdings LLC','llc','Delaware','2017-03-14','active','82-1194407','CT Corporation System','Acme / 2024-081','{holding,delaware}',p_user)
    returning id into e_acme;
  insert into entities (organization_id, legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter, parent_entity_id, tags, created_by)
  values
    (v_org,'Acme Operations LLC','llc','Georgia','2018-06-02','active','83-2210991','Registered Agents Inc.','Acme / 2024-081',e_acme,'{operating}',p_user)
    returning id into e_acme_ops;
  insert into entities (organization_id, legal_name, entity_type, jurisdiction, formation_date, status, registered_agent, client_matter, parent_entity_id, tags, created_by)
  values
    (v_org,'Acme IP Holdings LLC','llc','Delaware','2019-01-22','active','CT Corporation System','Acme / 2024-081',e_acme,'{ip,delaware}',p_user)
    returning id into e_acme_ip;
  insert into entities (organization_id, legal_name, entity_type, jurisdiction, formation_date, status, ein, registered_agent, client_matter, tags, created_by) values
    (v_org,'BluePine Ventures, Inc.','corporation','Delaware','2015-09-30','active','47-5520138','Corporation Service Company','BluePine / 2023-014','{venture,delaware}',p_user),
    (v_org,'Harbor Light Foundation','nonprofit','Georgia','2012-04-18','active','45-3391820','Harbor Light Foundation','Harbor / 2022-201','{501c3}',p_user),
    (v_org,'Copper Creek Partners LP','lp','Texas','2016-11-08','active','81-0448211','Capitol Corporate Services','Copper / 2024-032','{fund}',p_user),
    (v_org,'Northloop Realty LLC','llc','Illinois','2020-02-27','suspended','84-6620031','Illinois Corporation Service','Northloop / 2021-118','{real-estate}',p_user),
    (v_org,'Stella Maris Trust','trust','Florida','2010-07-12','active',null,'Trustee: Marianne Okafor','Stella / 2020-006','{trust}',p_user),
    (v_org,'Grove Street Coffee LLC','llc','Georgia','2021-05-04','active','86-1177209','Registered Agents Inc.','Grove / 2024-055','{operating,food}',p_user),
    (v_org,'Kestrel Analytics Ltd.','foreign_entity','United Kingdom','2019-10-15','pending','98-1544620','Cogency Global (US qualification)','Kestrel / 2024-090','{foreign,uk}',p_user);

  select id into e_bluepine  from entities where organization_id=v_org and legal_name like 'BluePine%';
  select id into e_harbor    from entities where organization_id=v_org and legal_name like 'Harbor%';
  select id into e_copper    from entities where organization_id=v_org and legal_name like 'Copper%';
  select id into e_northloop from entities where organization_id=v_org and legal_name like 'Northloop%';
  select id into e_stella    from entities where organization_id=v_org and legal_name like 'Stella%';
  select id into e_grove     from entities where organization_id=v_org and legal_name like 'Grove%';
  select id into e_kestrel   from entities where organization_id=v_org and legal_name like 'Kestrel%';

  -- Addresses ------------------------------------------------------------------
  insert into entity_addresses (entity_id, kind, line1, city, region, postal_code) values
    (e_acme,'principal_office','251 Little Falls Drive','Wilmington','DE','19808'),
    (e_acme,'mailing','PO Box 8412','Atlanta','GA','30306'),
    (e_acme_ops,'principal_office','990 Howell Mill Rd NW','Atlanta','GA','30318'),
    (e_bluepine,'principal_office','548 Market St #62411','San Francisco','CA','94104'),
    (e_grove,'principal_office','112 Grove St SE','Atlanta','GA','30312');

  -- People ---------------------------------------------------------------------
  insert into entity_people (entity_id, name, role, title, email, start_date) values
    (e_acme,'Daniel Reyes','manager','Manager','dreyes@acme.example','2017-03-14'),
    (e_acme,'Priya Natarajan','officer','Treasurer','priya@acme.example','2019-06-01'),
    (e_acme_ops,'Daniel Reyes','manager','Manager','dreyes@acme.example','2018-06-02'),
    (e_bluepine,'Alison Zhou','officer','President & CEO','alison@bluepine.example','2015-09-30'),
    (e_bluepine,'Marcus Webb','officer','Secretary','mwebb@bluepine.example','2016-01-15'),
    (e_bluepine,'Alison Zhou','director',null,'alison@bluepine.example','2015-09-30'),
    (e_bluepine,'Robert Ferraro','director',null,'rferraro@bluepine.example','2017-05-20'),
    (e_harbor,'Rev. Thomas Adeyemi','officer','Executive Director','tadeyemi@harborlight.example','2012-04-18'),
    (e_copper,'Copper Creek GP LLC','manager','General Partner',null,'2016-11-08'),
    (e_grove,'Samantha Ortiz','member','Managing Member','sam@grovestreet.example','2021-05-04');

  -- Ownership --------------------------------------------------------------------
  insert into entity_ownership (entity_id, owner_name, owner_type, owner_entity_id, percentage, units, effective_date) values
    (e_acme,'Daniel Reyes','individual',null,60.0,600,'2017-03-14'),
    (e_acme,'Reyes Family Trust','trust',null,40.0,400,'2020-01-01'),
    (e_acme_ops,'Acme Holdings LLC','entity',e_acme,100.0,1000,'2018-06-02'),
    (e_acme_ip,'Acme Holdings LLC','entity',e_acme,100.0,1000,'2019-01-22'),
    (e_grove,'Samantha Ortiz','individual',null,70.0,700,'2021-05-04'),
    (e_grove,'Miguel Ortiz','individual',null,30.0,300,'2021-05-04'),
    (e_bluepine,'Alison Zhou','individual',null,42.5,4250000,'2015-09-30'),
    (e_bluepine,'BluePine Employee Pool','other',null,12.5,1250000,'2018-03-01'),
    (e_bluepine,'Meridian Growth Fund II LP','entity',null,45.0,4500000,'2019-08-15');

  -- Compliance tasks -----------------------------------------------------------
  insert into compliance_tasks (organization_id, entity_id, name, task_type, due_date, status, priority, assigned_to, notes) values
    (v_org,e_acme,'Delaware franchise tax — Acme Holdings','franchise_tax', current_date + 18,'in_progress','high',p_user,'Calculated via assumed par value method last year.'),
    (v_org,e_acme_ip,'Delaware franchise tax — Acme IP','franchise_tax', current_date + 18,'not_started','normal',p_user,null),
    (v_org,e_acme_ops,'Georgia annual registration','annual_report', current_date + 41,'not_started','normal',p_user,null),
    (v_org,e_bluepine,'Delaware annual report + franchise tax','annual_report', current_date + 63,'not_started','high',p_user,'Large corp — confirm authorized shares before filing.'),
    (v_org,e_harbor,'IRS Form 990 filing','custom', current_date + 27,'waiting_on_client','high',p_user,'Waiting on final financials from bookkeeper.'),
    (v_org,e_copper,'Texas franchise tax report','franchise_tax', current_date + 9,'in_progress','high',p_user,null),
    (v_org,e_northloop,'Illinois reinstatement filing','custom', current_date - 12,'overdue','high',p_user,'Entity suspended for missed 2024 annual report.'),
    (v_org,e_grove,'Registered agent renewal','ra_renewal', current_date + 84,'not_started','low',p_user,null),
    (v_org,e_kestrel,'Georgia foreign qualification','foreign_qualification', current_date + 6,'in_progress','high',p_user,'Certificate of good standing ordered from Companies House.'),
    (v_org,e_bluepine,'Annual board meeting','board_meeting', current_date + 35,'not_started','normal',p_user,null),
    (v_org,e_stella,'Trustee annual accounting','custom', current_date - 4,'overdue','normal',p_user,null),
    (v_org,e_grove,'Ownership update — buyout closing','ownership_update', current_date + 21,'waiting_on_client','normal',p_user,'Miguel selling 10% to Samantha; awaiting signed purchase agreement.');

  -- Documents (metadata; upload real files through the app) ---------------------
  insert into documents (organization_id, entity_id, name, category, mime_type, size_bytes, uploaded_by, extracted_text) values
    (v_org,e_acme,'Certificate of Formation — Acme Holdings LLC.pdf','formation','application/pdf',412034,p_user,'Certificate of Formation of Acme Holdings LLC, a Delaware limited liability company, filed March 14, 2017 with the Delaware Secretary of State. Registered agent: CT Corporation System, 251 Little Falls Drive, Wilmington DE.'),
    (v_org,e_acme,'Amended & Restated Operating Agreement (2020).pdf','operating_agreement','application/pdf',1893340,p_user,'Amended and Restated Limited Liability Company Agreement of Acme Holdings LLC dated January 1, 2020. Members: Daniel Reyes (60%), Reyes Family Trust (40%). Manager-managed; Daniel Reyes sole Manager. Transfer restrictions in Article 8; right of first refusal to remaining members.'),
    (v_org,e_bluepine,'Certificate of Incorporation.pdf','formation','application/pdf',388120,p_user,'Certificate of Incorporation of BluePine Ventures, Inc. filed September 30, 2015 in Delaware. Authorized: 10,000,000 shares common stock, $0.0001 par value.'),
    (v_org,e_bluepine,'Bylaws (as amended 2019).pdf','bylaws','application/pdf',742211,p_user,'Bylaws of BluePine Ventures, Inc. Board of not fewer than 2 and not more than 7 directors. Annual meeting of stockholders in the second quarter.'),
    (v_org,e_harbor,'IRS Determination Letter 501(c)(3).pdf','tax','application/pdf',221450,p_user,'IRS determination letter recognizing Harbor Light Foundation as exempt under section 501(c)(3), effective April 2012. Public charity status 170(b)(1)(A)(vi).'),
    (v_org,e_grove,'Operating Agreement — Grove Street Coffee.pdf','operating_agreement','application/pdf',655902,p_user,'Operating Agreement of Grove Street Coffee LLC dated May 4, 2021. Members: Samantha Ortiz (70%), Miguel Ortiz (30%). Member-managed.'),
    (v_org,e_copper,'Limited Partnership Agreement.pdf','formation','application/pdf',2210034,p_user,'Agreement of Limited Partnership of Copper Creek Partners LP. General Partner: Copper Creek GP LLC. Fund term 10 years; management fee 2%.'),
    (v_org,e_acme_ops,'2025 Georgia Annual Registration (filed).pdf','annual_report','application/pdf',98244,p_user,'Georgia annual registration for Acme Operations LLC filed April 2025.');

  -- Resolutions -------------------------------------------------------------------
  insert into resolutions (organization_id, entity_id, title, resolution_type, status, body_md, created_by) values
    (v_org,e_bluepine,'Board Resolution — Opening Account at First Meridian Bank','banking_resolution','final',
     E'# Resolutions of the Board of Directors of BluePine Ventures, Inc.\n\n**RESOLVED**, that the Corporation open a deposit account at First Meridian Bank, and that the President and the Treasurer each be authorized to execute account documentation on behalf of the Corporation...\n\n*Adopted by unanimous written consent.*',p_user),
    (v_org,e_acme,'Written Consent — Appointment of Treasurer','officer_appointment','final',
     E'# Written Consent of the Sole Manager of Acme Holdings LLC\n\n**RESOLVED**, that Priya Natarajan is appointed Treasurer of the Company, effective June 1, 2019, to serve until a successor is duly appointed...',p_user);

  -- Activity log --------------------------------------------------------------------
  insert into activity_logs (organization_id, entity_id, actor_id, action, detail) values
    (v_org,e_acme,p_user,'entity.created','Acme Holdings LLC added'),
    (v_org,e_acme,p_user,'document.uploaded','Amended & Restated Operating Agreement (2020).pdf'),
    (v_org,e_bluepine,p_user,'resolution.created','Banking resolution — First Meridian Bank'),
    (v_org,e_northloop,p_user,'entity.updated','Status changed to Suspended'),
    (v_org,e_kestrel,p_user,'task.created','Georgia foreign qualification'),
    (v_org,null,p_user,'org.created','Workspace created');

  return v_org;
end $$;
