export interface paths {
  "/api/v1/auth/login": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Login and receive a JWT access token */
    post: operations["AuthController_login"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/clients": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all clients with pagination */
    get: operations["ClientsController_findAll"];
    put?: never;
    /** Create a new client */
    post: operations["ClientsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/clients/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a client by ID */
    get: operations["ClientsController_findOne"];
    /** Update a client */
    put: operations["ClientsController_update"];
    post?: never;
    /** Delete a client */
    delete: operations["ClientsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/corporations/payments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all corporation payments for a given month */
    get: operations["CorporationPaymentsController_findAll"];
    put?: never;
    /** Create a new corporation payment */
    post: operations["CorporationPaymentsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/corporations/{corporationId}/payments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a corporation's payments for a given month */
    get: operations["CorporationPaymentsController_findOne"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/corporations/payments/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /** Update a corporation's payment for a given month */
    put: operations["CorporationPaymentsController_update"];
    post?: never;
    /** Delete a corporation payment by ID */
    delete: operations["CorporationPaymentsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/vat-rates": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get the VAT rate history */
    get: operations["VatRatesController_findHistory"];
    /** Set the VAT percentage effective from a given month onward */
    put: operations["VatRatesController_upsert"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/vat-rates/resolve": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Resolve the VAT percentage effective for a month */
    get: operations["VatRatesController_resolve"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/corporations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all corporations with pagination */
    get: operations["CorporationsController_findAll"];
    put?: never;
    /** Create a new corporation */
    post: operations["CorporationsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/corporations/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a corporation by ID */
    get: operations["CorporationsController_findOne"];
    /** Update a corporation */
    put: operations["CorporationsController_update"];
    post?: never;
    /** Delete a corporation */
    delete: operations["CorporationsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/subcontractors/payments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all subcontractor payments */
    get: operations["SubcontractorPaymentsController_findAll"];
    put?: never;
    /** Create a new subcontractor payment */
    post: operations["SubcontractorPaymentsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/subcontractors/{subcontractorId}/payments": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a subcontractor payment by ID */
    get: operations["SubcontractorPaymentsController_findOne"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/subcontractor-payments/by-client": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get total subcontractor payments per client for a month */
    get: operations["SubcontractorPaymentsController_findByClient"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/subcontractors/payments/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /** Update a subcontractor payment */
    put: operations["SubcontractorPaymentsController_update"];
    post?: never;
    /** Delete a subcontractor payment by ID */
    delete: operations["SubcontractorPaymentsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/subcontractors": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all subcontractor with pagination */
    get: operations["SubcontractorsController_findAll"];
    put?: never;
    /** Create a new subcontractor */
    post: operations["SubcontractorsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/subcontractors/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a subcontractor by ID */
    get: operations["SubcontractorsController_findOne"];
    /** Update a subcontractor */
    put: operations["SubcontractorsController_update"];
    post?: never;
    /** Delete a subcontractor */
    delete: operations["SubcontractorsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/reports": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all project reports in a given month with pagination */
    get: operations["ProjectReportsController_findProjectReportsInMonth"];
    put?: never;
    /** Create a new project report */
    post: operations["ProjectReportsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/reports/{reportId}/income-entries": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Add a new income entry to an existing project report */
    post: operations["ProjectReportsController_addIncomeEntry"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/reports/income-entries/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    /** Update a single income entry */
    put: operations["ProjectReportsController_updateIncomeEntry"];
    post?: never;
    /** Delete a single income entry */
    delete: operations["ProjectReportsController_removeIncomeEntry"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/reports/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a project report by ID */
    get: operations["ProjectReportsController_findOne"];
    /** Update a project report */
    put: operations["ProjectReportsController_update"];
    post?: never;
    /** Delete a project report */
    delete: operations["ProjectReportsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/{id}/reports/previous": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get the previous month's project report */
    get: operations["ProjectReportsController_findProjectReportForPreviousMonth"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get all projects with pagination */
    get: operations["ProjectsController_findAll"];
    put?: never;
    /** Create a new project */
    post: operations["ProjectsController_create"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get a project by ID */
    get: operations["ProjectsController_findOne"];
    /** Update a project */
    put: operations["ProjectsController_update"];
    post?: never;
    /** Delete a project */
    delete: operations["ProjectsController_remove"];
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/income": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get monthly income grouped by client */
    get: operations["IncomeController_getMonthlyIncome"];
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/company-settings": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get the company settings */
    get: operations["CompanySettingsController_findOne"];
    /** Create or update the company settings */
    put: operations["CompanySettingsController_upsert"];
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/projects/reports/export-pdf": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** Export the monthly account-approval PDF for one project report */
    post: operations["PdfExportController_exportPdf"];
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    LoginDto: {
      /** @description Account username */
      username: string;
      /** @description Account password */
      password: string;
    };
    LoginResponseDto: {
      /** @description Signed JWT access token */
      accessToken: string;
    };
    CreateClientDto: {
      /**
       * @description Name of the client
       * @example John Doe
       */
      name: string;
    };
    ClientResponseDto: {
      /**
       * @description Unique identifier for the client
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the client
       * @example John Doe
       */
      name: string;
    };
    UpdateClientDto: {
      /**
       * @description Name of the client
       * @example John Doe
       */
      name: string;
    };
    CreateCorporationPaymentDto: {
      /**
       * @description Unique identifier for the project report associated with this payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectReportId: string;
      /**
       * @description Unique identifier for the corporation receiving the payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      corporationId: string;
      /**
       * @description The amount paid to the corporation for this project
       * @example 5000
       */
      amount: number;
      /**
       * @description The date the service was provided for this payment
       * @example 2026-01-10T00:00:00.000Z
       */
      date: string;
      /**
       * @description Optional description for this payment
       * @example Invoice #123
       */
      description?: string;
      /**
       * @description Whether this payment is for a future service
       * @example false
       */
      isFuture: boolean;
      /**
       * @description VAT percentage — only applicable when isFuture is false
       * @example 18
       */
      vatPercentage?: number;
    };
    NestedProjectReportDto: {
      /**
       * @description Unique identifier for the project report
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Unique identifier for the project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId: string;
      /**
       * @description Name of the project
       * @example Project Alpha
       */
      projectName: string;
    };
    NestedCorporationDto: {
      /**
       * @description Unique identifier for the corporation
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the corporation
       * @example Tech Solutions Inc.
       */
      name: string;
    };
    CorporationPaymentResponseDto: {
      /**
       * @description Unique identifier for the corporation payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /** @description Information about the project report associated with the payment */
      projectReport: components["schemas"]["NestedProjectReportDto"];
      /** @description Information about the corporation receiving the payment */
      corporation: components["schemas"]["NestedCorporationDto"];
      /**
       * @description The total amount paid to the corporation for this payment
       * @example 5000
       */
      amount: number;
      /**
       * @description The date when the payment was made
       * @example 2024-06-01T00:00:00.000Z
       */
      date: Record<string, never> | null;
      /**
       * @description Optional description for this payment
       * @example Invoice #123
       */
      description: Record<string, never> | null;
      /**
       * @description Whether this payment is for a future service
       * @example false
       */
      isFuture: boolean;
      /**
       * @description VAT percentage — only applicable when isFuture is false
       * @example 18
       */
      vatPercentage: Record<string, never> | null;
      /**
       * @description VAT amount derived from amount * vatPercentage / 100
       * @example 900
       */
      vatAmount?: number;
      /**
       * @description Effective total (amount + VAT amount)
       * @example 5900
       */
      effectiveTotal?: number;
    };
    NestedProjectPaymentDto: {
      /**
       * @description Unique identifier for the project payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /** @description Information about the project report this payment is associated with */
      projectReport: components["schemas"]["NestedProjectReportDto"];
      /**
       * @description The amount paid to the corporation for this project
       * @example 5000
       */
      amount: number;
      /**
       * Format: ISO-8601
       * @description The date the payment to the corporation was made
       * @example 2026-01-10T00:00:00.000Z
       */
      date: Record<string, never> | null;
      /**
       * @description VAT percentage applied to this payment
       * @example 18
       */
      vatPercentage: Record<string, never> | null;
      /**
       * @description VAT amount derived from vatPercentage × amount
       * @example 900
       */
      vatAmount: number;
      /**
       * @description Total amount including VAT
       * @example 5900
       */
      effectiveTotal: number;
      /**
       * @description Whether this payment is for a future service
       * @example false
       */
      isFuture: boolean;
      /**
       * @description Optional description for this payment
       * @example Invoice #123
       */
      description?: Record<string, never> | null;
    };
    MonthlyCorporationPaymentsResponseDto: {
      /** @description Information about the corporation receiving the payment */
      corporation: components["schemas"]["NestedCorporationDto"];
      /** @description The project payments associated with this corporation payment */
      projectPayments: components["schemas"]["NestedProjectPaymentDto"][];
      /**
       * @description The total amount paid to the corporation for this payment
       * @example 5000
       */
      total: number;
    };
    MultipleMonthlyCorporationPaymentsResponseDto: {
      /** @description List of corporation payments for the specified month */
      corporationsPayments: components["schemas"]["MonthlyCorporationPaymentsResponseDto"][];
      /**
       * @description The total amount paid to all corporations for the specified month
       * @example 15000
       */
      total: number;
    };
    UpdateCorporationPaymentDto: {
      /**
       * @description Unique identifier for the project report associated with this payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectReportId: string;
      /**
       * @description Unique identifier for the corporation receiving the payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      corporationId: string;
      /**
       * @description The amount paid to the corporation for this project
       * @example 5000
       */
      amount: number;
      /**
       * @description The date the service was provided for this payment
       * @example 2026-01-10T00:00:00.000Z
       */
      date: string;
      /**
       * @description Optional description for this payment
       * @example Invoice #123
       */
      description?: string;
      /**
       * @description Whether this payment is for a future service
       * @example false
       */
      isFuture: boolean;
      /**
       * @description VAT percentage — only applicable when isFuture is false
       * @example 18
       */
      vatPercentage?: number;
    };
    UpsertVatRateDto: {
      /**
       * Format: ISO-8601
       * @description A date within the month the VAT rate becomes effective from
       * @example 2026-04-01T00:00:00.000Z
       */
      month: string;
      /**
       * @description VAT percentage effective from the given month onward
       * @example 18
       */
      percentage: number;
    };
    VatRateResponseDto: {
      /**
       * @description Unique identifier for the VAT rate entry
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * Format: ISO-8601
       * @description The month this VAT percentage becomes effective from
       * @example 2026-04-01T00:00:00.000Z
       */
      effectiveMonth: string;
      /**
       * @description VAT percentage effective from this month onward
       * @example 18
       */
      percentage: number;
      /**
       * Format: ISO-8601
       * @description When this VAT rate entry was created
       * @example 2026-04-01T09:00:00.000Z
       */
      createdAt: string;
    };
    MonthQueryDto: {
      /**
       * Format: ISO-8601
       * @description A date within the month to query, in ISO-8601 format
       * @example 2024-06-15T00:00:00.000Z
       */
      month: string;
    };
    ResolvedVatRateResponseDto: {
      /**
       * @description VAT percentage effective for the queried month, or null if no VAT rate has ever been configured for that month or earlier
       * @example 18
       */
      percentage: Record<string, never> | null;
    };
    CreateCorporationDto: {
      /**
       * @description Name of the corporation
       * @example Tech Innovators Inc.
       */
      name: string;
    };
    CorporationResponseDto: {
      /**
       * @description Unique identifier for the corporation
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the corporation
       * @example Tech Innovators Inc.
       */
      name: string;
    };
    UpdateCorporationDto: {
      /**
       * @description Name of the corporation
       * @example Tech Innovators Inc.
       */
      name: string;
    };
    CreateSubcontractorPaymentDto: {
      /**
       * @description ID of the subcontractor that the payment belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      subcontractorId: string;
      /**
       * @description ID of the project that the payment belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId: string;
      /**
       * @description The date identifying the service month
       * @example 2026-01-01
       */
      serviceDate: string;
      /**
       * @description The amount of the payment
       * @example 1000
       */
      amount: number;
    };
    NestedSubcontractorDto: {
      /**
       * @description Unique identifier for the subcontractor
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the subcontractor
       * @example Acme Subcontracting
       */
      name: string;
    };
    SubcontractorPaymentResponseDto: {
      /**
       * @description Unique identifier for the subcontractor payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /** @description The subcontractor associated with the payment */
      subcontractor: components["schemas"]["NestedSubcontractorDto"];
      /**
       * @description ID of the project that the payment belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId: string;
      /**
       * Format: ISO-8601
       * @description The date identifying the service month
       * @example 2026-01-10T00:00:00.000Z
       */
      serviceDate: string;
      /**
       * @description The amount of the payment in cents
       * @example 156000
       */
      amount: number;
      /**
       * @description Whether the payment has been marked as paid
       * @example false
       */
      isPaid: boolean;
    };
    NestedSubcontractorPaymentDto: {
      /**
       * @description Unique identifier for the subcontractor payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description ID of the project this payment belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId: string;
      /**
       * @description The amount of the payment
       * @example 156000
       */
      amount: number;
      /**
       * @description Whether the payment has been marked as paid
       * @example false
       */
      isPaid: boolean;
    };
    MonthlySubcontractorPaymentsDto: {
      /** @description The subcontractor associated with the payments */
      subcontractor: components["schemas"]["NestedSubcontractorDto"];
      /**
       * @description The service month start date
       * @example 2026-01-01T00:00:00.000Z
       */
      serviceDate: string;
      /**
       * @description The total amount owed to the subcontractor for the month
       * @example 5000
       */
      amountOwed: number;
      /**
       * @description The total amount paid to the subcontractor for the month
       * @example 3000
       */
      amountPaid: number;
      /** @description List of payments made to the subcontractor for the month */
      payments: components["schemas"]["NestedSubcontractorPaymentDto"][];
    };
    SubcontractorPaymentsByClientResponseDto: {
      /**
       * @description Unique identifier for the client
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      clientId: string;
      /**
       * @description Name of the client
       * @example Acme Corp
       */
      clientName: string;
      /**
       * @description Total subcontractor payments for this client in the month
       * @example 15000
       */
      totalSubcontractorPayments: number;
    };
    UpdateSubcontractorPaymentDto: {
      /**
       * @description ID of the subcontractor that the payment belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      subcontractorId?: string;
      /**
       * @description ID of the project that the payment belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId?: string;
      /**
       * @description The date identifying the service month
       * @example 2026-01-01
       */
      serviceDate?: string;
      /**
       * @description The amount of the payment
       * @example 1000
       */
      amount?: number;
      /**
       * @description Whether the payment has been marked as paid
       * @example true
       */
      isPaid?: boolean;
    };
    CreateSubcontractorDto: {
      /**
       * @description Name of the subcontractor
       * @example Quality Builders LLC
       */
      name: string;
      /**
       * @description Israeli company registration number of the private company, 9 digits
       * @example 515123456
       */
      companyNumber: string;
    };
    SubcontractorResponseDto: {
      /**
       * @description Unique identifier for the subcontractor
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the subcontractor
       * @example Quality Builders LLC
       */
      name: string;
      /**
       * @description Israeli company registration number of the private company, 9 digits
       * @example 515123456
       */
      companyNumber: string;
    };
    UpdateSubcontractorDto: {
      /**
       * @description Name of the subcontractor
       * @example Quality Builders LLC
       */
      name: string;
      /**
       * @description Israeli company registration number of the private company, 9 digits
       * @example 515123456
       */
      companyNumber: string;
    };
    CreateIncomeEntryDto: {
      /**
       * @description Income amount for this entry
       * @example 50000
       */
      amount: number;
      /**
       * Format: ISO-8601
       * @description Date when this income was received (null = not yet received)
       * @example 2026-01-15
       */
      incomeDate?: string;
      /**
       * @description Short free-text label describing the work this income covers; surfaced as a badge on the account-approval PDF
       * @example שלד
       */
      tag?: Record<string, never> | null;
    };
    CreateProjectReportDto: {
      /**
       * @description ID of the project this report belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId: string;
      /**
       * @description ID of the subcontractor for this report. If none is given and there is an existing report for the project, its subcontractor will be used
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      subcontractorId?: string;
      /**
       * Format: ISO-8601
       * @description Date of the project report in ISO-8601 format
       * @example 2026-01-10
       */
      date: string;
      /**
       * @description Profit margin percentage for the report. If none is given and a report for the project already exists, its profit margin will be used
       * @example 15.5
       */
      profitMargin?: number;
      /** @description Income entries for this report (at least one required) */
      incomeEntries: components["schemas"]["CreateIncomeEntryDto"][];
      /** @description A list of the payments made to corporations for their work on this project this month */
      corporationPayments: components["schemas"]["CreateCorporationPaymentDto"][];
    };
    NestedClientDto: {
      /**
       * @description Unique identifier for the client
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the client
       * @example John Doe
       */
      name: string;
    };
    NestedProjectWithClientDto: {
      /**
       * @description Unique identifier for the project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the project
       * @example Office Building Renovation
       */
      name: string;
      /** @description Basic information on the project's client */
      client: components["schemas"]["NestedClientDto"];
    };
    IncomeEntryResponseDto: {
      /**
       * @description Unique identifier for the income entry
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Income amount for this entry
       * @example 50000
       */
      amount: number;
      /**
       * @description Date when this income was received, or null if not yet received
       * @example 2026-01-15T00:00:00.000Z
       */
      incomeDate: Record<string, never> | null;
      /**
       * @description Short label describing the work this income covers, or null if untagged
       * @example שלד
       */
      tag: Record<string, never> | null;
    };
    NestedCorporationPaymentDto: {
      /**
       * @description Unique identifier for the corporation payment
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /** @description Information on the corporation */
      corporation: components["schemas"]["NestedCorporationDto"];
      /**
       * @description The amount of money paid to the corporation
       * @example 20000
       */
      amount: number;
      /**
       * @description VAT percentage applicable to this payment
       * @example 18
       */
      vatPercentage?: Record<string, never> | null;
      /**
       * @description VAT amount (amount * vatPercentage / 100)
       * @example 900
       */
      vatAmount?: number;
      /**
       * @description Effective total (amount + VAT amount)
       * @example 23600
       */
      effectiveTotal?: number;
    };
    ProjectReportListItemDto: {
      /**
       * @description Unique identifier for the project report
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /** @description Information on the report's project (including client) */
      project: components["schemas"]["NestedProjectWithClientDto"];
      /** @description Information on the report's subcontractor */
      subcontractor: components["schemas"]["NestedSubcontractorDto"];
      /**
       * Format: ISO-8601
       * @description The project report's date
       * @example 2026-01-10T00:00:00.000Z
       */
      date: string;
      /**
       * @description The profit margin for the project
       * @example 6
       */
      profitMargin: number;
      /**
       * @description Total income computed from all income entries
       * @example 100000
       */
      totalIncome: number;
      /** @description Individual income entries for this report */
      incomeEntries: components["schemas"]["IncomeEntryResponseDto"][];
      /** @description Corporation payments for this report */
      corporationPayments: components["schemas"]["NestedCorporationPaymentDto"][];
    };
    UpdateIncomeEntryDto: {
      /**
       * @description Updated income amount
       * @example 50000
       */
      amount?: number;
      /**
       * @description Updated income date (null to mark as not yet received)
       * @example 2026-01-15
       */
      incomeDate?: Record<string, never> | null;
      /**
       * @description Updated work label (null or blank to clear it)
       * @example גמר
       */
      tag?: Record<string, never> | null;
    };
    NestedProjectDto: {
      /**
       * @description Unique identifier for the project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the project
       * @example Office Building Renovation
       */
      name: string;
    };
    NestedSubcontractorWithPaymentDto: {
      /**
       * @description Unique identifier for the subcontractor
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description Name of the subcontractor
       * @example Quality Builders LLC
       */
      name: string;
      /**
       * @description The payment the subcontractor is owed for that project that month
       * @example 10000
       */
      payment: number;
    };
    ProjectReportResponseDto: {
      /**
       * @description Unique identifier for the project report
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /** @description Information on the report's project */
      project: components["schemas"]["NestedProjectDto"];
      /**
       * Format: ISO-8601
       * @description The project report's date
       * @example 2026-01-10T00:00:00.000Z
       */
      date: string;
      /**
       * @description The profit margin for the project
       * @example 6
       */
      profitMargin: number;
      /**
       * @description The profit made from the project in the given month
       * @example 2000
       */
      profit: number;
      /**
       * @description Total income computed from all income entries
       * @example 100000
       */
      totalIncome: number;
      /** @description Individual income entries for this report */
      incomeEntries: components["schemas"]["IncomeEntryResponseDto"][];
      /** @description The payments made to corporations for their work on the project that month */
      corporationPayments: components["schemas"]["NestedCorporationPaymentDto"][];
      /** @description Subcontractor information for the given month's project report */
      subcontractor: components["schemas"]["NestedSubcontractorWithPaymentDto"];
    };
    UpdateProjectReportDto: {
      /**
       * @description ID of the project this report belongs to
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectId: string;
      /**
       * @description ID of the subcontractor for this report. If none is given and there is an existing report for the project, its subcontractor will be used
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      subcontractorId?: string;
      /**
       * Format: ISO-8601
       * @description Date of the project report in ISO-8601 format
       * @example 2026-01-10
       */
      date: string;
      /**
       * @description Profit margin percentage for the report. If none is given and a report for the project already exists, its profit margin will be used
       * @example 15.5
       */
      profitMargin?: number;
      /** @description Income entries for this report (at least one required) */
      incomeEntries: components["schemas"]["CreateIncomeEntryDto"][];
      /** @description A list of the payments made to corporations for their work on this project this month */
      corporationPayments: components["schemas"]["CreateCorporationPaymentDto"][];
    };
    CreateProjectDto: {
      /**
       * @description ID of the client that owns this project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      clientId: string;
      /**
       * @description Name of the project
       * @example Office Building Renovation
       */
      name: string;
      /**
       * @description Estimated amount for the project
       * @example 150000.5
       */
      estimatedAmount: number;
      /**
       * @description A description of the project
       * @example Renovation of the office building located at 123 Main St.
       */
      description: string;
      /**
       * @description Whether the project is closed/done
       * @default false
       * @example false
       */
      isDone: boolean;
    };
    ProjectBasicResponseDto: {
      /**
       * @description Unique identifier for the project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description ID of the client that owns this project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      clientId: string;
      /**
       * @description Name of the project
       * @example Office Building Renovation
       */
      name: string;
      /**
       * @description Estimated amount for the project
       * @example 150000.5
       */
      estimatedAmount: number;
      /**
       * @description A description of the project
       * @example Renovation of the office building located at 123 Main St.
       */
      description: string;
      /**
       * @description Whether the project is closed/done
       * @example false
       */
      isDone: boolean;
    };
    ProjectClientDto: {
      /** @example 123e4567-e89b-12d3-a456-426614174000 */
      id: string;
      /** @example Acme Corp */
      name: string;
    };
    ProjectPaymentProgressDto: {
      /**
       * @description The total amount of money the client already paid for the project
       * @example 40000
       */
      totalPaid: number;
    };
    ProjectResponseDto: {
      /**
       * @description Unique identifier for the project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      id: string;
      /**
       * @description ID of the client that owns this project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      clientId: string;
      /** @description Client that owns this project */
      client: components["schemas"]["ProjectClientDto"] | null;
      /**
       * @description Name of the project
       * @example Office Building Renovation
       */
      name: string;
      /**
       * @description Estimated amount for the project
       * @example 150000.5
       */
      estimatedAmount: number;
      /**
       * @description A description of the project
       * @example Renovation of the office building located at 123 Main St.
       */
      description: string;
      /** @description The payment progress the client has made on the project */
      paymentProgress: components["schemas"]["ProjectPaymentProgressDto"];
      /**
       * @description Whether the project is closed/done
       * @example false
       */
      isDone: boolean;
      /**
       * @description Whether the project has any reports
       * @example true
       */
      hasReports: boolean;
    };
    UpdateProjectDto: {
      /**
       * @description ID of the client that owns this project
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      clientId: string;
      /**
       * @description Name of the project
       * @example Office Building Renovation
       */
      name: string;
      /**
       * @description Estimated amount for the project
       * @example 150000.5
       */
      estimatedAmount: number;
      /**
       * @description A description of the project
       * @example Renovation of the office building located at 123 Main St.
       */
      description: string;
      /**
       * @description Whether the project is closed/done
       * @default false
       * @example false
       */
      isDone: boolean;
    };
    MonthlyIncomeProjectDto: {
      projectId: string;
      projectName: string;
      totalIncome: number;
      receivedIncome: number;
      pendingIncome: number;
      profit: number;
    };
    MonthlyIncomeItemDto: {
      clientId: string;
      clientName: string;
      projects: components["schemas"]["MonthlyIncomeProjectDto"][];
      totalIncome: number;
      totalProfit: number;
    };
    CompanySettingsResponseDto: {
      /**
       * @description Fixed identifier of the singleton company settings record
       * @example company-settings
       */
      id: string;
      /**
       * @description Name of the contractor company
       * @example Acme Construction Ltd.
       */
      name: Record<string, never> | null;
      /**
       * @description Description of the contractor company
       * @example General contractor specializing in residential renovations
       */
      description: Record<string, never> | null;
      /**
       * @description Israeli company registration number of the contractor, 9 digits
       * @example 515123456
       */
      companyNumber: Record<string, never> | null;
      /**
       * @description Phone number of the contractor company
       * @example +972501234567
       */
      phone: Record<string, never> | null;
      /**
       * @description Email address of the contractor company
       * @example info@acme-construction.com
       */
      email: Record<string, never> | null;
      /**
       * @description Street address of the contractor company
       * @example 12 Herzl St.
       */
      addressStreet: Record<string, never> | null;
      /**
       * @description City of the contractor company
       * @example Tel Aviv
       */
      addressCity: Record<string, never> | null;
      /**
       * @description Base64 data URL of the company logo image
       * @example data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
       */
      logo: Record<string, never> | null;
      /**
       * @description Base64 data URL of the contractor's signature image
       * @example data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
       */
      signature: Record<string, never> | null;
      /**
       * @description Timestamp of the last update to the company settings
       * @example 2026-07-31T10:39:08.000Z
       */
      updatedAt: string;
    };
    UpsertCompanySettingsDto: {
      /**
       * @description Name of the contractor company
       * @example Acme Construction Ltd.
       */
      name?: Record<string, never> | null;
      /**
       * @description Description of the contractor company
       * @example General contractor specializing in residential renovations
       */
      description?: Record<string, never> | null;
      /**
       * @description Israeli company registration number of the contractor, 9 digits
       * @example 515123456
       */
      companyNumber?: Record<string, never> | null;
      /**
       * @description Phone number of the contractor company
       * @example +972501234567
       */
      phone?: Record<string, never> | null;
      /**
       * @description Email address of the contractor company
       * @example info@acme-construction.com
       */
      email?: Record<string, never> | null;
      /**
       * @description Street address of the contractor company
       * @example 12 Herzl St.
       */
      addressStreet?: Record<string, never> | null;
      /**
       * @description City of the contractor company
       * @example Tel Aviv
       */
      addressCity?: Record<string, never> | null;
      /**
       * @description Base64 data URL of the company logo image
       * @example data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
       */
      logo?: Record<string, never> | null;
      /**
       * @description Base64 data URL of the contractor's signature image
       * @example data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
       */
      signature?: Record<string, never> | null;
    };
    ExportProjectReportsPdfDto: {
      /**
       * @description Project report to render
       * @example 123e4567-e89b-12d3-a456-426614174000
       */
      projectReportId: string;
      /**
       * @description Free text describing what the account approval covers; the project name is appended to it on the document
       * @example עבודות שלד + גמר
       */
      approvedFor: string;
      /**
       * @description Language/direction of the rendered PDF
       * @default he
       * @example he
       */
      lang: string;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
  AuthController_login: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["LoginDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["LoginResponseDto"];
        };
      };
      /** @description Invalid credentials */
      401: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ClientsController_findAll: {
    parameters: {
      query?: {
        /** @description Page number (1-based) */
        page?: number;
        /** @description Items per page */
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description List of clients */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ClientResponseDto"][];
        };
      };
    };
  };
  ClientsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateClientDto"];
      };
    };
    responses: {
      /** @description The client has been successfully created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ClientResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Client already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ClientsController_findOne: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Client ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The client has been found. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ClientResponseDto"];
        };
      };
    };
  };
  ClientsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Client ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateClientDto"];
      };
    };
    responses: {
      /** @description The client has been successfully updated. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ClientResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Client not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Client name already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ClientsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Client ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The client has been successfully deleted. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Client not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationPaymentsController_findAll: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description List of corporation payments for the specified month. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MultipleMonthlyCorporationPaymentsResponseDto"];
        };
      };
      /** @description Invalid input data for pagination or date filtering. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationPaymentsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateCorporationPaymentDto"];
      };
    };
    responses: {
      /** @description The corporation payment has been successfully created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CorporationPaymentResponseDto"];
        };
      };
      /** @description Invalid input data for creating corporation payment. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Conflict occurred while creating corporation payment. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationPaymentsController_findOne: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
      };
      header?: never;
      path: {
        /** @description Corporation ID */
        corporationId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Corporation's payments for the specified month. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MonthlyCorporationPaymentsResponseDto"];
        };
      };
      /** @description Invalid input data for date filtering. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Corporation not found or no payments for the specified month. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationPaymentsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Corporation payment ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateCorporationPaymentDto"];
      };
    };
    responses: {
      /** @description The updated corporation payment for the specified month. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CorporationPaymentResponseDto"];
        };
      };
      /** @description Invalid input data for updating corporation payment. */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Corporation payment not found for the specified month. */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Conflict occurred while updating corporation payment. */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationPaymentsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Corporation payment ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The corporation payment has been successfully deleted. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Corporation payment not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  VatRatesController_findHistory: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["VatRateResponseDto"][];
        };
      };
    };
  };
  VatRatesController_upsert: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpsertVatRateDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["VatRateResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  VatRatesController_resolve: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: components["schemas"]["MonthQueryDto"];
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ResolvedVatRateResponseDto"];
        };
      };
      /** @description Invalid month query */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationsController_findAll: {
    parameters: {
      query?: {
        /** @description Page number (1-based) */
        page?: number;
        /** @description Items per page */
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description List of corporations */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CorporationResponseDto"][];
        };
      };
      /** @description Invalid pagination parameters */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateCorporationDto"];
      };
    };
    responses: {
      /** @description The corporation has been successfully created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CorporationResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Corporation already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationsController_findOne: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Corporation ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The corporation has been found. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CorporationResponseDto"];
        };
      };
      /** @description Corporation not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Corporation ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateCorporationDto"];
      };
    };
    responses: {
      /** @description The corporation has been successfully updated. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CorporationResponseDto"];
        };
      };
      /** @description Corporation not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Corporation name already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  CorporationsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Corporation ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The corporation has been successfully deleted. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Corporation not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorPaymentsController_findAll: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description List of subcontractor payments. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MonthlySubcontractorPaymentsDto"][];
        };
      };
      /** @description Invalid query parameters */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorPaymentsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateSubcontractorPaymentDto"];
      };
    };
    responses: {
      /** @description The subcontractor payment has been successfully created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorPaymentResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorPaymentsController_findOne: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
      };
      header?: never;
      path: {
        /** @description Subcontractor ID */
        subcontractorId: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The subcontractor payment with the matching ID. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MonthlySubcontractorPaymentsDto"];
        };
      };
      /** @description Subcontractor payment not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorPaymentsController_findByClient: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Total subcontractor payments grouped by client. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorPaymentsByClientResponseDto"][];
        };
      };
      /** @description Invalid query parameters */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorPaymentsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subcontractor payment ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateSubcontractorPaymentDto"];
      };
    };
    responses: {
      /** @description The subcontractor payment has been successfully updated. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorPaymentResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Subcontractor payment not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Subcontractor payment conflict */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorPaymentsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subcontractor payment ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The subcontractor payment has been successfully deleted. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Subcontractor payment not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorsController_findAll: {
    parameters: {
      query?: {
        /** @description Page number (1-based) */
        page?: number;
        /** @description Items per page */
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description List of subcontractors */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorResponseDto"][];
        };
      };
    };
  };
  SubcontractorsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateSubcontractorDto"];
      };
    };
    responses: {
      /** @description The subcontractor has been successfully created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Subcontractor already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorsController_findOne: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subcontractor ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The subcontractor has been found. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorResponseDto"];
        };
      };
    };
  };
  SubcontractorsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subcontractor ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateSubcontractorDto"];
      };
    };
    responses: {
      /** @description The subcontractor has been successfully updated. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["SubcontractorResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Subcontractor not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Subcontractor name already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  SubcontractorsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Subcontractor ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Subcontractor not found */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_findProjectReportsInMonth: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
        /** @description Page number (1-based) */
        page?: number;
        /** @description Items per page */
        limit?: number;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectReportListItemDto"][];
        };
      };
      /** @description Invalid pagination or month query parameters */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateProjectReportDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectReportListItemDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project report already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_addIncomeEntry: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project report ID */
        reportId: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateIncomeEntryDto"];
      };
    };
    responses: {
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IncomeEntryResponseDto"];
        };
      };
      /** @description Project report not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_updateIncomeEntry: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Income entry ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateIncomeEntryDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["IncomeEntryResponseDto"];
        };
      };
      /** @description Income entry not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_removeIncomeEntry: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Income entry ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Income entry not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_findOne: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project report ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectReportResponseDto"];
        };
      };
      /** @description Project report not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project report ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateProjectReportDto"];
      };
    };
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectReportListItemDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project report not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project report already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project report ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project report not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectReportsController_findProjectReportForPreviousMonth: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: components["schemas"]["MonthQueryDto"];
      };
      header?: never;
      path: {
        /** @description Project ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectReportListItemDto"];
        };
      };
      /** @description Invalid month query */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project report not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectsController_findAll: {
    parameters: {
      query?: {
        /** @description Page number (1-based) */
        page?: number;
        /** @description Items per page */
        limit?: number;
        /** @description Return active projects (isDone=false AND has at least one report). Default: true. */
        active?: boolean;
        /** @description Return future projects (no reports yet). Default: false. */
        future?: boolean;
        /** @description Return closed projects (isDone=true). Default: false. */
        closed?: boolean;
        /** @description Filter by client ID */
        clientId?: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description List of projects */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectResponseDto"][];
        };
      };
      /** @description Invalid pagination parameters */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectsController_create: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateProjectDto"];
      };
    };
    responses: {
      /** @description The project has been successfully created. */
      201: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectBasicResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectsController_findOne: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The project has been found. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectResponseDto"];
        };
      };
      /** @description Project not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectsController_update: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateProjectDto"];
      };
    };
    responses: {
      /** @description The project has been successfully updated. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["ProjectBasicResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project already exists */
      409: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  ProjectsController_remove: {
    parameters: {
      query?: never;
      header?: never;
      path: {
        /** @description Project ID */
        id: string;
      };
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The project has been successfully deleted. */
      204: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description Project not found */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  IncomeController_getMonthlyIncome: {
    parameters: {
      query: {
        /** @description A date within the month to query, in ISO-8601 format */
        month: string;
      };
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description Monthly income grouped by client and project */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["MonthlyIncomeItemDto"][];
        };
      };
    };
  };
  CompanySettingsController_findOne: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody?: never;
    responses: {
      /** @description The company settings, or null if never configured. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CompanySettingsResponseDto"];
        };
      };
    };
  };
  CompanySettingsController_upsert: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpsertCompanySettingsDto"];
      };
    };
    responses: {
      /** @description The company settings have been successfully saved. */
      200: {
        headers: {
          [name: string]: unknown;
        };
        content: {
          "application/json": components["schemas"]["CompanySettingsResponseDto"];
        };
      };
      /** @description Invalid input data */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
  PdfExportController_exportPdf: {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ExportProjectReportsPdfDto"];
      };
    };
    responses: {
      /** @description Company settings incomplete, or no VAT rate configured for the month */
      400: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
      /** @description No project report found with the given id */
      404: {
        headers: {
          [name: string]: unknown;
        };
        content?: never;
      };
    };
  };
}
