$ErrorActionPreference = "Stop"

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location) "tmp" }
$outputPath = Join-Path $scriptRoot "..\献静艺术-钢琴成长与积分规则-家长学生版.docx"
$outputPath = [System.IO.Path]::GetFullPath($outputPath)

$wdAlignParagraphLeft = 0
$wdAlignParagraphCenter = 1
$wdAlignParagraphRight = 2
$wdCollapseEnd = 0
$wdFormatDocumentDefault = 16
$wdLineStyleSingle = 1
$wdPageBreak = 7
$wdPreferredWidthPercent = 2

function ConvertTo-WordColor {
  param([int]$Red, [int]$Green, [int]$Blue)
  return $Red + ($Green * 256) + ($Blue * 65536)
}

$colorInk = ConvertTo-WordColor 39 48 44
$colorGreen = ConvertTo-WordColor 39 103 82
$colorLightGreen = ConvertTo-WordColor 232 242 237
$colorGold = ConvertTo-WordColor 181 132 40
$colorLightGold = ConvertTo-WordColor 250 245 229
$colorLine = ConvertTo-WordColor 207 218 212
$colorMuted = ConvertTo-WordColor 100 111 106
$colorWhite = ConvertTo-WordColor 255 255 255

$word = $null
$doc = $null

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $doc = $word.Documents.Add()
  $selection = $word.Selection

  $doc.PageSetup.TopMargin = $word.CentimetersToPoints(1.8)
  $doc.PageSetup.BottomMargin = $word.CentimetersToPoints(1.7)
  $doc.PageSetup.LeftMargin = $word.CentimetersToPoints(2.0)
  $doc.PageSetup.RightMargin = $word.CentimetersToPoints(2.0)

  function Add-Paragraph {
    param(
      [string]$Text,
      [double]$Size = 11,
      [bool]$Bold = $false,
      [int]$Align = 0,
      [int]$Color = $colorInk,
      [double]$SpaceBefore = 0,
      [double]$SpaceAfter = 5,
      [double]$LineSpacing = 17
    )

    $selection.Font.Name = "Calibri"
    $selection.Font.NameFarEast = "Microsoft YaHei"
    $selection.Font.Size = $Size
    $selection.Font.Bold = [int]$Bold
    $selection.Font.Color = $Color
    $selection.ParagraphFormat.Alignment = $Align
    $selection.ParagraphFormat.SpaceBefore = $SpaceBefore
    $selection.ParagraphFormat.SpaceAfter = $SpaceAfter
    $selection.ParagraphFormat.LineSpacing = $LineSpacing
    $selection.TypeText($Text)
    $selection.TypeParagraph()
  }

  function Add-SectionHeading {
    param([string]$Text)
    Add-Paragraph -Text $Text -Size 13 -Bold $true -Color $colorGreen -SpaceBefore 10 -SpaceAfter 5 -LineSpacing 19
  }

  function Add-PageBreak {
    $selection.InsertBreak($wdPageBreak)
  }

  function Set-CellText {
    param(
      $Cell,
      [string]$Text,
      [bool]$Bold = $false,
      [int]$Color = $colorInk,
      [int]$Background = 0,
      [double]$Size = 10.5
    )

    $range = $Cell.Range
    $range.Text = $Text
    $range.Font.Name = "Calibri"
    $range.Font.NameFarEast = "Microsoft YaHei"
    $range.Font.Size = $Size
    $range.Font.Bold = [int]$Bold
    $range.Font.Color = $Color
    $range.ParagraphFormat.SpaceAfter = 0
    $range.ParagraphFormat.LineSpacing = 16
    $Cell.VerticalAlignment = 1
    if ($Background -ne 0) {
      $Cell.Shading.BackgroundPatternColor = $Background
    }
  }

  function Format-Table {
    param($Table)
    $Table.PreferredWidthType = $wdPreferredWidthPercent
    $Table.PreferredWidth = 100
    $Table.Rows.SetLeftIndent(0, 0)
    $Table.Borders.InsideLineStyle = $wdLineStyleSingle
    $Table.Borders.OutsideLineStyle = $wdLineStyleSingle
    $Table.Borders.InsideColor = $colorLine
    $Table.Borders.OutsideColor = $colorLine
    $Table.TopPadding = 5
    $Table.BottomPadding = 5
    $Table.LeftPadding = 6
    $Table.RightPadding = 6
  }

  function Move-AfterTable {
    param($Table)
    $range = $Table.Range
    $range.Collapse($wdCollapseEnd)
    $range.Select()
    $word.Selection.TypeParagraph()
  }

  Add-Paragraph -Text "献静艺术" -Size 10.5 -Bold $true -Align $wdAlignParagraphCenter -Color $colorGold -SpaceAfter 4
  Add-Paragraph -Text "钢琴成长与积分规则" -Size 20 -Bold $true -Align $wdAlignParagraphCenter -Color $colorInk -SpaceAfter 3 -LineSpacing 25
  Add-Paragraph -Text "家长与学生版" -Size 12 -Bold $true -Align $wdAlignParagraphCenter -Color $colorGreen -SpaceAfter 2
  Add-Paragraph -Text "修订日期：2026 年 7 月 19 日" -Size 9.5 -Align $wdAlignParagraphCenter -Color $colorMuted -SpaceAfter 12

  $introTable = $doc.Tables.Add($selection.Range, 1, 1)
  Format-Table $introTable
  Set-CellText -Cell $introTable.Cell(1, 1) -Text "孩子的努力分别记在两个账户里：成长值记录长期进步，积分用来兑换礼物。兑换礼物只扣积分，不影响成长等级。" -Bold $true -Color $colorGreen -Background $colorLightGreen -Size 11
  Move-AfterTable $introTable

  Add-SectionHeading "一、两个账户，两种用途"
  $accountTable = $doc.Tables.Add($selection.Range, 5, 3)
  Format-Table $accountTable
  Set-CellText $accountTable.Cell(1, 1) "项目" $true $colorWhite $colorGreen
  Set-CellText $accountTable.Cell(1, 2) "成长值" $true $colorWhite $colorGreen
  Set-CellText $accountTable.Cell(1, 3) "积分" $true $colorWhite $colorGreen
  Set-CellText $accountTable.Cell(2, 1) "用途" $true
  Set-CellText $accountTable.Cell(2, 2) "记录长期学习和练习成果"
  Set-CellText $accountTable.Cell(2, 3) "在积分商城兑换礼物"
  Set-CellText $accountTable.Cell(3, 1) "是否消耗" $true
  Set-CellText $accountTable.Cell(3, 2) "正常兑换不消耗"
  Set-CellText $accountTable.Cell(3, 3) "兑换成功后会减少"
  Set-CellText $accountTable.Cell(4, 1) "排名" $true
  Set-CellText $accountTable.Cell(4, 2) "排名看累计成长值"
  Set-CellText $accountTable.Cell(4, 3) "积分余额不参与排名"
  Set-CellText $accountTable.Cell(5, 1) "当前是否过期" $true
  Set-CellText $accountTable.Cell(5, 2) "不过期"
  Set-CellText $accountTable.Cell(5, 3) "不过期"
  Move-AfterTable $accountTable

  Add-PageBreak
  Add-SectionHeading "二、怎样获得奖励"
  $rewardTable = $doc.Tables.Add($selection.Range, 3, 4)
  Format-Table $rewardTable
  Set-CellText $rewardTable.Cell(1, 1) "奖励项目" $true $colorWhite $colorGreen
  Set-CellText $rewardTable.Cell(1, 2) "条件" $true $colorWhite $colorGreen
  Set-CellText $rewardTable.Cell(1, 3) "成长值" $true $colorWhite $colorGreen
  Set-CellText $rewardTable.Cell(1, 4) "积分" $true $colorWhite $colorGreen
  Set-CellText $rewardTable.Cell(2, 1) "课堂回课" $true
  Set-CellText $rewardTable.Cell(2, 2) "本节课回课合格"
  Set-CellText $rewardTable.Cell(2, 3) "+5 成长星" $true $colorGreen
  Set-CellText $rewardTable.Cell(2, 4) "+5 积分" $true $colorGreen
  Set-CellText $rewardTable.Cell(3, 1) "每周练习" $true
  Set-CellText $rewardTable.Cell(3, 2) "老师根据当周练习情况评定"
  Set-CellText $rewardTable.Cell(3, 3) "0～35 成长星" $true $colorGreen
  Set-CellText $rewardTable.Cell(3, 4) "0～35 积分" $true $colorGreen
  Move-AfterTable $rewardTable

  Add-Paragraph "回课未达到合格标准时，本节课的回课奖励可不发放。每周练习奖励中，获得多少成长星，就同时获得多少积分。" 10.5 $false $wdAlignParagraphLeft $colorInk 0 6 17

  $exampleTable = $doc.Tables.Add($selection.Range, 1, 1)
  Format-Table $exampleTable
  Set-CellText -Cell $exampleTable.Cell(1, 1) -Text "结算示例：本节课回课合格，本周练习奖励为 28，本次共获得 33 成长星和 33 积分。" -Bold $true -Color $colorInk -Background $colorLightGold -Size 10.5
  Move-AfterTable $exampleTable

  Add-SectionHeading "三、成长等级怎样计算"
  Add-Paragraph "35 颗成长星 = 1 个成长月亮" 11 $true $wdAlignParagraphLeft $colorGreen 0 3
  Add-Paragraph "10 个成长月亮 = 1 个成长太阳" 11 $true $wdAlignParagraphLeft $colorGreen 0 3
  Add-Paragraph "也就是：350 颗成长星 = 1 个成长太阳" 10.5 $false $wdAlignParagraphLeft $colorInk 0 5
  Add-Paragraph "成长等级由系统根据累计成长星自动计算。排名也只看累计成长值，前三名显示金、银、铜皇冠。兑换礼物不会让成长等级或排名因积分减少而下降。" 10.5 $false $wdAlignParagraphLeft $colorInk 0 5 17

  Add-PageBreak
  Add-SectionHeading "四、礼物怎样兑换"
  Add-Paragraph "1. 普通礼物：礼物已上架、有库存且当前积分足够即可申请。" 10.5
  Add-Paragraph "2. 高级礼物：除了积分足够，还需达到礼物页面标明的成长等级。" 10.5
  Add-Paragraph "3. 申请提交成功后会立即扣除对应积分，申请进入待处理状态。" 10.5
  Add-Paragraph "4. 老师审核并完成礼物发放；如申请未通过，已扣除的积分会返还。" 10.5
  Add-Paragraph "高级礼物的成长等级只是兑换门槛，兑换时不会被扣除。" 10.5 $true $wdAlignParagraphLeft $colorGreen 0 6

  Add-SectionHeading "五、记录与更正"
  Add-Paragraph "每节课的奖励只结算一次。获得、兑换、返还和更正都有记录可查。" 10.5
  Add-Paragraph "如因误操作、课时作废等原因导致记录有误，老师可按实际情况更正。若误发积分在更正前已被使用，账户可能暂时显示欠分，之后新获得的积分会先抵扣欠分。" 10.5

  Add-SectionHeading "六、常见问题"
  Add-Paragraph "换了礼物，月亮、太阳或排名会减少吗？" 10.5 $true $wdAlignParagraphLeft $colorInk 0 2
  Add-Paragraph "不会。兑换只扣积分，不扣成长值。" 10.5 $false $wdAlignParagraphLeft $colorMuted 0 5
  Add-Paragraph "每周练习奖励是固定 35 吗？" 10.5 $true $wdAlignParagraphLeft $colorInk 0 2
  Add-Paragraph "不是。35 是每周上限，实际奖励由老师根据当周练习情况在 0～35 之间评定。" 10.5 $false $wdAlignParagraphLeft $colorMuted 0 5
  Add-Paragraph "积分会过期吗？" 10.5 $true $wdAlignParagraphLeft $colorInk 0 2
  Add-Paragraph "当前版本不设积分过期时间。" 10.5 $false $wdAlignParagraphLeft $colorMuted 0 8

  $noteTable = $doc.Tables.Add($selection.Range, 1, 1)
  Format-Table $noteTable
  Set-CellText -Cell $noteTable.Cell(1, 1) -Text "规则说明：本文档为当前 V1.0 规则。如后续调整，以老师正式通知及小程序最新展示为准。" -Color $colorMuted -Background $colorLightGreen -Size 9.5
  Move-AfterTable $noteTable

  $footer = $doc.Sections.Item(1).Footers.Item(1).Range
  $footer.Text = "献静艺术·钢琴成长与积分规则"
  $footer.Font.NameFarEast = "Microsoft YaHei"
  $footer.Font.Size = 8.5
  $footer.Font.Color = $colorMuted
  $footer.ParagraphFormat.Alignment = $wdAlignParagraphCenter

  $doc.SaveAs([ref]$outputPath, [ref]$wdFormatDocumentDefault)
}
finally {
  if ($doc -ne $null) {
    try { $doc.Close() } catch {}
  }
  if ($word -ne $null) {
    try { $word.Quit() } catch {}
  }
  [System.GC]::Collect()
  [System.GC]::WaitForPendingFinalizers()
}

Write-Output $outputPath
