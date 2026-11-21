# Make the repository available under the MIT License

Allow all users and organizations to fork, use, and copy this repository while preserving InsideOut AI’s copyright and license notice when distributing copies or substantial portions.

Use the standard MIT License, following Matt Pocock’s licensing approach. Users may also modify, merge, publish, distribute, sublicense, and sell copies, including as part of closed-source commercial products. Published modifications do not have to remain open source. Credit is provided through preservation of the copyright and license notice; no additional promotional credit is required.

MIT applies to the current repository and future releases, replacing trial limits and subscription fees for those versions. Historical releases retain their recorded licenses, prior rights remain intact, and existing customer agreements are not automatically cancelled.

## Acceptance Criteria — Added During Refinement

```gherkin
Scenario: Anyone can use the repository without a subscription
  Given an individual or organization wants to use the current repository or a future release
  When they obtain it under the MIT License
  Then they may use, fork, copy, and modify it without licensing fees
  And no trial duration or paid subscription limits those permissions
```

```gherkin
Scenario: Commercial redistribution and closed-source derivatives are permitted
  Given a user complies with the MIT License
  When they publish, distribute, sublicense, or sell copies or modified versions
  Then those activities are permitted
  And they may include the work in closed-source commercial products
  And they are not required to publish their modifications as open source
```

```gherkin
Scenario: Distributed copies preserve InsideOut AI credit
  Given a user distributes copies or substantial portions of the work
  When recipients receive them
  Then InsideOut AI’s copyright notice and the MIT permission notice are included
  And no additional promotional credit is required
```

```gherkin
Scenario: Current licensing information consistently describes MIT permissions
  Given a user reviews the current repository’s licensing, installation, or subscription guidance
  When they determine their rights to the current version
  Then the guidance identifies the standard MIT License and its warranty disclaimer
  And it does not present the former commercial restrictions as conditions for that version
```

```gherkin
Scenario: Historical rights and customer agreements are preserved
  Given earlier releases have recorded licenses or customers have existing agreements
  When the current repository becomes MIT licensed
  Then historical license records and previously granted rights remain intact
  And existing customer agreements are not automatically cancelled
```

```gherkin
Scenario: The MIT grant respects ownership and third-party obligations
  Given the repository includes contributions or third-party material
  When the repository is offered under MIT
  Then the grant covers only material the rights holders have authorized for MIT licensing
  And applicable third-party licenses and required notices remain preserved
```
