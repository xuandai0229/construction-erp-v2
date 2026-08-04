# HR Phase 1 — Schema Dictionary

## Data Models

### 1. `OrganizationUnit`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (CUID) | PK | Unique identifier |
| `code` | String | Unique | Department code (e.g. BGD, PKT) |
| `name` | String | | Department name |
| `parentId` | String? | FK -> OrganizationUnit | Parent department ID |
| `description` | String? | | Optional notes |
| `orderIndex` | Int | Default: 0 | Display ordering |
| `isActive` | Boolean | Default: true | Soft-active status |
| `createdAt` | DateTime | | Creation timestamp |
| `updatedAt` | DateTime | | Update timestamp |

### 2. `Position`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (CUID) | PK | Unique identifier |
| `code` | String | Unique | Position code |
| `title` | String | | Position title (e.g. Trưởng phòng) |
| `level` | Int | Default: 1 | Hierarchy level |
| `isActive` | Boolean | Default: true | Soft-active status |

### 3. `Employee`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (CUID) | PK | Unique identifier |
| `code` | String | Unique | Employee code (`NV-YYYY-NNNN`) |
| `userId` | String? | Unique, FK -> User | Optional linked User account |
| `fullName` | String | | Full name |
| `gender` | String? | | Gender |
| `dateOfBirth` | DateTime? | | Date of birth |
| `phoneNumber` | String? | | Contact phone |
| `personalEmail` | String? | | Contact email |
| `identityNumberEncrypted` | String? | | AES-256-GCM encrypted CCCD |
| `identityNumberBlindIndex` | String? | Unique | HMAC-SHA256 blind index |
| `identityNumberLastDigits` | String? | | Last 4 digits for UI masking |
| `joinedDate` | DateTime | | Company join date |
| `resignedDate` | DateTime? | | Company resignation date |
| `status` | EmployeeStatus | Enum | PROBATION, ACTIVE, SUSPENDED, RESIGNED, RETIRED |

### 4. `EmployeeOrganizationAssignment`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (CUID) | PK | Unique assignment ID |
| `employeeId` | String | FK -> Employee | Employee ID |
| `organizationUnitId` | String | FK -> OrganizationUnit | Department ID |
| `positionId` | String | FK -> Position | Position ID |
| `startDate` | DateTime | | Effective start date |
| `endDate` | DateTime? | | Effective end date (null if active) |
| `isPrimary` | Boolean | Default: true | Primary department flag |

### 5. `EmployeeProjectAssignment`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (CUID) | PK | Assignment ID |
| `employeeId` | String | FK -> Employee | Employee ID |
| `projectId` | String | FK -> Project | Project ID |
| `projectPersonnelRoleId` | String | FK -> ProjectPersonnelRole | Role ID |
| `startDate` | DateTime | | Assignment start date |
| `expectedEndDate` | DateTime? | | Expected end date |
| `endDate` | DateTime? | | Actual release date |
| `allocationPercentage` | Int | Default: 100 | Time allocation percentage |
| `status` | EmployeeProjectAssignmentStatus | Enum | ACTIVE, COMPLETED, RELEASED, CANCELLED |

### 6. `UserAccessGrant`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | String (CUID) | PK | Grant ID |
| `userId` | String | FK -> User | Target user ID |
| `permissionCode` | String | FK -> HrPermissionDefinition | Permission code |
| `effect` | GrantEffect | ALLOW / DENY | Policy effect (DENY overrides ALLOW) |
| `scope` | HrDataScope | Enum | ALL_EMPLOYEES, OWN_ORGANIZATION_UNIT, OWN_PROJECTS, SELF_ONLY, NONE |
| `sensitiveFieldPolicy` | SensitiveFieldPolicy | Enum | BASIC_ONLY, CONTACT, IDENTITY, CONTRACT, BANKING, FULL |
| `validFrom` | DateTime? | | Start validity |
| `validUntil` | DateTime? | | End validity |
| `revokedAt` | DateTime? | | Revocation timestamp |
