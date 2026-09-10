# Solar Energy Potential System
## Meralco Residential Bill → Solar PV System Recommendation

### 1. Purpose

This system estimates a household's solar energy potential and recommends an appropriate solar photovoltaic (PV) system based on the customer's monthly Meralco electricity bill.

The system converts the monthly electricity cost into estimated energy consumption, estimates the required solar capacity, and recommends:

- Solar PV capacity (kWp)
- Number of solar panels
- Inverter size
- Battery storage size
- Estimated daily and monthly solar production
- Estimated solar offset
- Estimated savings
- Simple payback period

> **Important:** The peso bill is only a starting point. For an accurate design, the system should use the customer's actual kWh consumption from the Meralco bill whenever available.

---

## 2. Input Data

### Required Inputs

| Input | Example |
|---|---:|
| Monthly Meralco bill | ₱10,000 |
| Meralco electricity rate | ₱12.14/kWh |
| Solar panel rating | 550 W |
| Peak Sun Hours (PSH) | 4.5–5.0 hours/day |
| System efficiency | 80% |
| Desired solar offset | 80–100% |

### Optional Inputs

- Actual monthly kWh consumption
- Roof area
- Roof orientation
- Roof tilt
- Shading percentage
- Customer location
- Daytime vs nighttime electricity usage
- Desired backup duration
- Battery usable capacity
- Solar equipment cost
- Installation cost

---

# 3. Calculation Flow

```text
Meralco Monthly Bill
        ↓
Electricity Rate (₱/kWh)
        ↓
Estimated Monthly Consumption (kWh)
        ↓
Daily Energy Consumption
        ↓
Required Solar Generation
        ↓
Recommended PV Capacity (kWp)
        ↓
Number of Solar Panels
        ↓
Inverter Size
        ↓
Battery Requirement
        ↓
Solar Energy Potential Report
```

---

# 4. Step 1 — Estimate Electricity Consumption

If actual kWh consumption is not available:

```text
Monthly Consumption (kWh)
= Monthly Electricity Bill ÷ Meralco Rate
```

### Example

```text
₱10,000 ÷ ₱12.14/kWh
= 824 kWh/month
```

Estimated monthly consumption:

**≈ 824 kWh/month**

---

# 5. Step 2 — Calculate Daily Consumption

```text
Daily Consumption
= Monthly Consumption ÷ 30
```

Example:

```text
824 ÷ 30
= 27.47 kWh/day
```

Estimated daily consumption:

**≈ 27.5 kWh/day**

Annual consumption:

```text
824 × 12
= 9,888 kWh/year
```

---

# 6. Step 3 — Calculate Required Solar Capacity

A practical Philippine solar calculation can use:

```text
Solar Energy Produced
= PV Capacity × Peak Sun Hours × System Efficiency
```

Assumptions:

```text
Peak Sun Hours = 4.5 hours/day
System Efficiency = 80%
```

Therefore:

```text
1 kWp × 4.5 × 0.80
= 3.6 kWh/day
```

A 1 kWp solar system can therefore be estimated at approximately:

**3.6 kWh/day**

---

# 7. Step 4 — Calculate PV Capacity

For approximately 100% energy production:

```text
Required PV Capacity
= Daily Consumption ÷ (PSH × System Efficiency)
```

Example:

```text
27.47 ÷ (4.5 × 0.80)
= 7.63 kWp
```

Recommended theoretical PV capacity:

**≈ 7.6 kWp**

For practical equipment selection, this can be rounded to:

**7.7 kWp**

---

# 8. Step 5 — Calculate Number of Solar Panels

Assuming a 550 W panel:

```text
Number of Panels
= Required PV Capacity ÷ Panel Capacity
```

Example:

```text
7.7 kWp ÷ 0.55 kW
= 14 panels
```

Recommended system:

**14 × 550 W solar panels**

Total PV capacity:

```text
14 × 550 W
= 7,700 W
= 7.7 kWp
```

---

# 9. Step 6 — Estimate Solar Production

For a 7.7 kWp system:

```text
Daily Production
= 7.7 × 4.5 × 0.80
= 27.72 kWh/day
```

Estimated monthly production:

```text
27.72 × 30
= 831.6 kWh/month
```

This is approximately equivalent to the estimated 824 kWh/month consumption.

### Important

Actual production will vary because of:

- Weather
- Cloud cover
- Roof orientation
- Roof tilt
- Shading
- Temperature
- Panel degradation
- Inverter efficiency
- Wiring losses
- Dirt and dust
- Grid availability

The calculation should therefore be treated as a **preliminary solar potential estimate**, not a final engineering design.

---

# 10. Step 7 — Inverter Sizing

For a 7.7 kWp PV array, a practical preliminary recommendation is:

**8 kW hybrid inverter**

Example:

```text
PV Array:       7.7 kWp
Inverter:       8 kW Hybrid
DC/AC Ratio:    7.7 ÷ 8 = 0.96
```

Alternative:

```text
PV Array:       6.6 kWp
Inverter:       6 kW Hybrid
```

The final inverter must be checked against:

- Maximum PV input voltage
- Maximum PV input current
- MPPT voltage range
- Maximum PV power
- Number of MPPT trackers
- Battery voltage
- Maximum battery charging/discharging current
- Required backup loads
- Local electrical requirements

---

# 11. Step 8 — Battery Sizing

Battery sizing should be based on the customer's **nighttime and backup-load requirement**, not simply total monthly consumption.

### Basic formula

```text
Battery Capacity
= Required Backup Energy ÷ Maximum Depth of Discharge
```

Example:

If the household wants approximately 8 kWh of usable backup energy and the battery has 80% usable depth of discharge:

```text
8 ÷ 0.80
= 10 kWh
```

Recommended battery:

**≈ 10 kWh**

For stronger nighttime/backup capability:

**10–15 kWh lithium battery**

For longer backup periods:

**15–20+ kWh**

---

# 12. Example Solar Energy Potential

## Customer Profile

```text
Monthly Bill:          ₱10,000
Reference Rate:        ₱12.14/kWh
Estimated Consumption: 824 kWh/month
Daily Consumption:     27.5 kWh/day
```

## Recommended System

```text
Solar Panels:          14 × 550 W
PV Capacity:            7.7 kWp
Hybrid Inverter:        8 kW
Battery:                10–15 kWh
```

## Estimated Generation

```text
Daily:                  ≈ 27.7 kWh/day
Monthly:                ≈ 832 kWh/month
Annual:                 ≈ 9,979 kWh/year
```

This indicates that a 7.7 kWp system could theoretically produce approximately the same amount of energy as the estimated household consumption under the assumptions used.

---

# 13. Solar Offset

The basic solar energy offset can be estimated as:

```text
Solar Offset %
= Solar Energy Used ÷ Household Energy Consumption × 100
```

However, **solar generation is not automatically equal to bill reduction**.

There are two important components:

### Self-consumption

Solar electricity is used immediately by appliances.

This generally provides the highest value because it avoids buying electricity from the grid.

### Solar export

Excess solar electricity is exported to the grid.

Under net metering, exported electricity is credited differently from the retail electricity rate. Therefore, the system should not assume that every exported kWh is worth the full Meralco retail rate.

---

# 14. Recommended System Modes

## Option A — Grid-Tied

```text
Solar Panels
      ↓
Grid-Tied Inverter
      ↓
House
      ↓
Meralco Grid
```

Best for:

- Lower initial cost
- Maximum daytime bill reduction
- Homes that do not require battery backup

Recommended PV:

**6.6–7.7 kWp**

---

## Option B — Hybrid Solar + Battery

```text
                ┌── House
                │
Solar Panels → Hybrid Inverter → Meralco Grid
                │
                ↓
             Battery
```

Best for:

- Bill reduction
- Nighttime solar utilization
- Brownout backup
- Higher energy independence

Recommended:

**7.7 kWp PV + 8 kW hybrid inverter + 10–15 kWh battery**

---

## Option C — High Energy Independence

```text
7.7–10 kWp Solar
        +
15–20+ kWh Battery
        +
Hybrid Inverter
```

Best for:

- High nighttime consumption
- Frequent power interruptions
- Greater energy independence

This option has a higher initial investment.

---

# 15. Solar Potential Scoring System

A future software version can assign a solar potential score.

### Example

```text
Solar Potential Score =

Energy Requirement        25%
Roof Availability         20%
Solar Irradiance          20%
Shading                   15%
Daytime Consumption       10%
Electrical Compatibility  10%
```

### Rating

| Score | Classification |
|---:|---|
| 90–100 | Excellent |
| 75–89 | Very Good |
| 60–74 | Good |
| 40–59 | Moderate |
| Below 40 | Low |

---

# 16. Customer-Facing Solar Calculator

The system can ask the customer:

### Step 1

**What is your average monthly Meralco bill?**

Example:

```text
₱10,000
```

### Step 2

**What is your actual monthly consumption?**

```text
824 kWh
```

If unavailable:

```text
Estimate kWh from electricity bill
```

### Step 3

**What is your primary goal?**

```text
[ Reduce Electricity Bill ]
[ Backup During Brownouts ]
[ Energy Independence ]
```

### Step 4

**How much roof space is available?**

```text
Small
Medium
Large
```

### Step 5

Generate:

```text
YOUR SOLAR POTENTIAL

Estimated Consumption:
824 kWh/month

Recommended Solar:
7.7 kWp

Solar Panels:
14 × 550 W

Recommended Inverter:
8 kW Hybrid

Recommended Battery:
10–15 kWh

Estimated Solar Production:
~832 kWh/month

Potential Solar Offset:
~100% of estimated energy consumption*

Recommended System:
7.7 kWp Hybrid Solar System
```

---

# 17. Important Disclaimer

The calculator provides a **preliminary solar energy potential estimate**.

Final system sizing must be validated through:

1. Actual Meralco bill/kWh history
2. Site inspection
3. Roof measurements
4. Solar irradiation assessment
5. Shading analysis
6. Electrical load analysis
7. Panel/string configuration
8. Inverter specifications
9. Battery requirements
10. Local utility/net-metering requirements

Do not guarantee a zero Meralco bill based solely on the calculator.

---

# 18. Recommended Development Logic

```text
INPUT
↓
Monthly Bill
↓
Check Actual kWh
↓
If kWh available:
    Use actual kWh
Else:
    Estimate kWh = Bill ÷ Reference Rate
↓
Calculate Daily Consumption
↓
Select Target Solar Offset
↓
Calculate Required kWp
↓
Round to Available Panel Configuration
↓
Calculate Panel Count
↓
Select Inverter
↓
Calculate Battery Requirement
↓
Estimate Solar Production
↓
Estimate Self-Consumption
↓
Estimate Grid Export
↓
Estimate Bill Reduction
↓
Calculate ROI / Payback
↓
GENERATE SOLAR POTENTIAL REPORT
```

---

# 19. Core Formulas

### Monthly consumption

```text
kWh/month = Monthly Bill ÷ Electricity Rate
```

### Daily consumption

```text
kWh/day = Monthly kWh ÷ 30
```

### Solar production

```text
Solar kWh/day
= PV kWp × PSH × System Efficiency
```

### Required PV capacity

```text
PV kWp
= Target Daily Solar Energy ÷ (PSH × System Efficiency)
```

### Panel count

```text
Panel Count
= Required kWp ÷ Panel kW
```

### Actual installed capacity

```text
Installed kWp
= Panel Count × Panel Wattage ÷ 1,000
```

### Battery size

```text
Battery kWh
= Required Backup Energy ÷ Usable DoD
```

### Solar offset

```text
Solar Offset %
= Solar Energy Used ÷ Total Consumption × 100
```

### Simple payback

```text
Payback Period
= Total System Cost ÷ Annual Savings
```

---

# 20. Example Final Recommendation

For a household with a **₱10,000/month Meralco bill**, using **₱12.14/kWh as the reference rate**:

```text
Estimated Consumption       ~824 kWh/month
Daily Consumption           ~27.5 kWh/day

Recommended PV              7.7 kWp
Solar Panels                14 × 550 W
Hybrid Inverter             8 kW
Battery                     10–15 kWh

Estimated Solar Production  ~832 kWh/month
```

### Suggested Product Concept

**SOLAR ENERGY POTENTIAL CALCULATOR**

> **Know Your Energy. Calculate Your Solar. Own Your Power.**

The system should turn a customer's Meralco bill into a simple, understandable solar recommendation while clearly distinguishing **estimated generation, self-consumption, grid export, bill savings, and battery backup**.
